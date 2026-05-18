/**
 * Agent Orchestrator
 *
 * Implements the agentic tool-call loop with automatic LLM provider fallback:
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │  Build messages                                          │
 *   │       ↓                                                  │
 *   │  callLLMWithFallback ──► OpenAI (primary)                │
 *   │       │                   if unavailable → Groq fallback │
 *   │       ↓                                                  │
 *   │  finish_reason = "stop"  → return                        │
 *   │       ↓                                                  │
 *   │  finish_reason = "tool_calls"                            │
 *   │       ↓                                                  │
 *   │  Execute each tool  →  append results                    │
 *   │       ↓                                                  │
 *   │  Loop (max MAX_ITERATIONS)                               │
 *   └──────────────────────────────────────────────────────────┘
 *
 * Conversation history is persisted in the DB (Conversation model), so users
 * never lose their session when a provider switch happens mid-conversation.
 */

import { buildSystemPrompt }              from "./prompts"
import { getToolDefinitions, executeTool } from "@/lib/tools/registry"
import { AgentError, GroqApiError }        from "@/lib/errors"
import {
  callLLMWithFallback,
  AllProvidersExhaustedError,
  type ApiKeys,
}                                          from "./providers"
import type { ChatMessage, ToolContext, ToolResult } from "./types"

// ─── Config ───────────────────────────────────────────────────────────────────

const MAX_HISTORY_MESSAGES  = 8

/** Hard cap on tool-call rounds per request to prevent runaway loops. */
const MAX_ITERATIONS = 6

const SUBMIT_CONFIRMATION_RE =
  /^(yes|y|ok|okay|confirm|confirmed|submit|send|go ahead|نعم|ايوه|أيوه|تمام|موافق|نفذ|ابعت|ارسل|ارسال)$/i

function isExplicitSubmitConfirmation(message: string): boolean {
  return SUBMIT_CONFIRMATION_RE.test(message.trim())
}

function sanitizeAssistantReply(content: string): string {
  // Strip only invisible C0/C1 control chars; preserve full Unicode range
  // (Arabic, accented Latin, emoji). The old regex incorrectly removed all
  // non-ASCII / non-Arabic characters from model responses.
  // eslint-disable-next-line no-control-regex
  return content
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/gu, "")
    .replace(/[ 	]{3,}/g, "  ")
    .trim()
}

// ─── Public result type ───────────────────────────────────────────────────────

export interface OrchestratorResult {
  content: string
  toolsUsed: string[]
  provider?: string
  /** Populated when submit_request succeeds during this turn. */
  requestId?: string
  requestModule?: string
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function runAgent(
  userMessage: string,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  ctx: ToolContext,
  apiKeys: ApiKeys,
): Promise<OrchestratorResult> {
  const messages: ChatMessage[] = [
    { role: "system", content: buildSystemPrompt() },
    ...history
      .slice(-MAX_HISTORY_MESSAGES)
      .map((m) => ({ role: m.role, content: m.content } as ChatMessage)),
    { role: "user", content: userMessage },
  ]

  const toolsUsed:   string[] = []
  let requestId:     string | undefined
  let requestModule: string | undefined
  let usedProvider:  string | undefined

  const toolDefinitions = getToolDefinitions(ctx.userRole)

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    let llmResult: Awaited<ReturnType<typeof callLLMWithFallback>>
    try {
      llmResult = await callLLMWithFallback(messages, toolDefinitions, apiKeys)
    } catch (err) {
      if (err instanceof AllProvidersExhaustedError) {
        throw new AgentError(
          "The AI assistant is temporarily unavailable (all providers are rate-limited). Please try again in a minute.",
          "ALL_PROVIDERS_EXHAUSTED",
          503,
        )
      }
      console.error("[orchestrator] LLM call failed:", err)
      throw new GroqApiError(
        err instanceof Error ? err.message : "Unknown LLM error",
      )
    }

    const { response, provider } = llmResult
    usedProvider = provider
    const choice           = response.choices[0]
    const assistantMessage = choice.message

    // ── Terminal: model is done ────────────────────────────────────────────────
    if (choice.finish_reason === "stop" || !assistantMessage.tool_calls?.length) {
      return {
        content:
          sanitizeAssistantReply(
            assistantMessage.content ??
            "I'm sorry, I couldn't generate a response. Please try again.",
          ),
        toolsUsed,
        provider: usedProvider,
        requestId,
        requestModule,
      }
    }

    // ── Tool calls: execute each one, then loop ────────────────────────────────
    messages.push({
      role:       "assistant",
      content:    assistantMessage.content,
      tool_calls: assistantMessage.tool_calls,
    })

    for (const toolCall of assistantMessage.tool_calls) {
      const toolName = toolCall.function.name
      toolsUsed.push(toolName)

      let result: ToolResult
      try {
        const args: unknown = JSON.parse(toolCall.function.arguments)
        if (toolName === "submit_request" && !isExplicitSubmitConfirmation(userMessage)) {
          result = {
            success: false,
            error:
              "Do not submit yet. The latest user message is not an explicit confirmation. " +
              "Collect every required field, show a complete summary, then ask the user to confirm with yes/no.",
          }
        } else {
          result = await executeTool(toolName, args, ctx)
        }

        if (toolName === "submit_request" && result.success && result.data) {
          const d = result.data as { requestId: string; module: string }
          requestId    = d.requestId
          requestModule = d.module
        }
      } catch (err) {
        result = {
          success: false,
          error: err instanceof Error ? err.message : "Tool execution failed.",
        }
        console.error(`[orchestrator] tool "${toolName}" threw:`, err)
      }

      messages.push({
        role:         "tool",
        tool_call_id: toolCall.id,
        content:      JSON.stringify(result),
      })
    }
  }

  throw new AgentError(
    "The agent reached its maximum processing limit. Please try a simpler request.",
    "MAX_ITERATIONS_EXCEEDED",
    500,
  )
}
