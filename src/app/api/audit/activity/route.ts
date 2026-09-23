import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { logServerAudit } from "@/lib/serverAuditLog"

export const runtime = "nodejs"

const PAGE_VIEW_WINDOW_MS = 5 * 60 * 1000
const recentPageViews = new Map<string, number>()

function clientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? ""
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { pathname?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }) }
  const pathname = typeof body.pathname === "string" ? body.pathname : ""

  // Record only an internal path, without query parameters or arbitrary text.
  if (!pathname.startsWith("/") || pathname.includes("?") || pathname.length > 240) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 })
  }

  const key = `${session.user.id}:${pathname}`
  const now = Date.now()
  if (now - (recentPageViews.get(key) ?? 0) < PAGE_VIEW_WINDOW_MS) {
    return NextResponse.json({ recorded: false })
  }
  recentPageViews.set(key, now)

  logServerAudit({
    actor: session.user.name ?? session.user.email,
    actorEmail: session.user.email,
    action: "page_view",
    targetId: "",
    targetTitle: pathname,
    details: "Authenticated page opened",
    category: "access",
    outcome: "success",
    path: pathname,
    ipAddress: clientIp(request),
    userAgent: request.headers.get("user-agent")?.slice(0, 500) ?? "",
  })

  return NextResponse.json({ recorded: true })
}
