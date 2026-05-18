/**
 * POST /api/ai-assistant
 *
 * Thin route — all business logic lives in the orchestrator and tools.
 * This route handles:
 *   1. Authentication
 *   2. Input validation
 *   3. Per-user rate limiting
 *   4. Loading conversation history from DB (server-authoritative)
 *   5. Running the agentic loop
 *   6. Persisting conversation (awaited — no race condition)
 *   7. Returning typed response
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/options"
import { getPrisma } from "@/server/engine/prisma"
import { runAgent } from "@/lib/agent/orchestrator"
import { AgentError, RateLimitError } from "@/lib/errors"
import type { AgentRequestBody, AgentResponseBody } from "@/lib/agent/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// ─── In-memory rate limiter ───────────────────────────────────────────────────
// 20 messages / user / 60 s.  Replace Map with Redis INCR+EXPIRE for multi-instance.

interface RateBucket { count: number; resetAt: number }
const rateBuckets = new Map<string, RateBucket>()
const RATE_LIMIT  = 20
const WINDOW_MS   = 60_000

function checkRateLimit(userId: string): void {
  const now    = Date.now()
  const bucket = rateBuckets.get(userId)
  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(userId, { count: 1, resetAt: now + WINDOW_MS })
    return
  }
  if (bucket.count >= RATE_LIMIT) throw new RateLimitError()
  bucket.count++
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Auth ──────────────────────────────────────────────────────────────────
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const apiKeys = {
    openai: process.env.OPENAI_API_KEY  || undefined,
    groq:   process.env.GROQ_API_KEY    || undefined,
  }
  if (!apiKeys.groq && !apiKeys.openai) {
    return NextResponse.json(
      { error: "AI assistant is not configured. Contact your administrator." },
      { status: 503 },
    )
  }

  // 2. Parse & validate body ─────────────────────────────────────────────────
  let body: AgentRequestBody
  try {
    body = (await req.json()) as AgentRequestBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const message = body.message?.trim()
  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 })
  }
  if (message.length > 2000) {
    return NextResponse.json(
      { error: "Message too long (max 2000 characters)" },
      { status: 400 },
    )
  }

  const conversationId = body.conversationId ?? null

  // 3. Rate limit ────────────────────────────────────────────────────────────
  try {
    checkRateLimit(session.user.id)
  } catch (err) {
    if (err instanceof AgentError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    throw err
  }

  // 4. Load conversation history from DB (server-authoritative) ──────────────
  // Trusting the client's history array would allow fabrication attacks.
  // We always load from DB when a conversationId is present.
  const clientHistory = Array.isArray(body.history) ? body.history : []
  const dbHistory     = conversationId
    ? await loadConversationHistory(conversationId, session.user.id)
    : null

  // DB history is authoritative when available; fall back to client history
  // for the first turn (no ID yet) or when load fails.
  const effectiveHistory = dbHistory ?? clientHistory

  // 5. Build tool context ────────────────────────────────────────────────────
  const ctx = {
    userId:    session.user.id,
    userName:  session.user.name  ?? "",
    userEmail: session.user.email ?? "",
    userRole:  session.user.role  ?? "employee",
  }

  // 6. Run the agentic loop ─────────────────────────────────────────────────
  let result: Awaited<ReturnType<typeof runAgent>>
  try {
    result = await runAgent(message, effectiveHistory, ctx, apiKeys)
  } catch (err) {
    if (err instanceof AgentError) {
      console.error(`[ai-assistant] AgentError (${err.code}):`, err.message)
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error("[ai-assistant] Unexpected error:", err)
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    )
  }

  // 7. Persist conversation (awaited — no race condition) ────────────────────
  // Awaiting adds ~10–50 ms of DB latency, negligible vs. LLM call duration.
  const savedId = await persistConversation(
    conversationId,
    session.user.id,
    message,
    result.content,
    effectiveHistory,
  ).catch((err: unknown) => {
    console.error("[ai-assistant] conversation persist error:", err)
    return conversationId // degrade gracefully — don't fail the user request
  })

  // 8. Return response ───────────────────────────────────────────────────────
  const response: AgentResponseBody = {
    content:        result.content,
    conversationId: savedId ?? `tmp-${Date.now()}`,
    requestId:      result.requestId,
    requestModule:  result.requestModule,
  }

  return NextResponse.json(response)
}

// ─── Load conversation history from DB ────────────────────────────────────────

async function loadConversationHistory(
  conversationId: string,
  userId: string,
): Promise<Array<{ role: "user" | "assistant"; content: string }> | null> {
  try {
    const prisma = getPrisma()
    const conv   = await prisma.conversation.findUnique({
      where:  { id: conversationId },
      select: { messages: true, userId: true },
    })

    // Silently reject if conversation belongs to a different user
    if (!conv || conv.userId !== userId) return null

    const msgs = conv.messages as Array<{ role: string; content: string }>
    return msgs
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m)    => ({ role: m.role as "user" | "assistant", content: m.content }))
  } catch (err) {
    console.error("[ai-assistant] Failed to load conversation history:", err)
    return null
  }
}

// ─── Persist conversation to DB ───────────────────────────────────────────────

async function persistConversation(
  conversationId: string | null,
  userId: string,
  userMessage: string,
  assistantReply: string,
  previousHistory: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<string> {
  const prisma = getPrisma()

  const allMessages = [
    ...previousHistory,
    { role: "user"      as const, content: userMessage },
    { role: "assistant" as const, content: assistantReply },
  ]

  if (conversationId) {
    await prisma.conversation.update({
      where: { id: conversationId },
      data:  { messages: allMessages, updatedAt: new Date() },
    })
    return conversationId
  }

  const newConv = await prisma.conversation.create({
    data: {
      userId,
      title:    userMessage.slice(0, 80),
      messages: allMessages,
    },
  })
  return newConv.id
}
