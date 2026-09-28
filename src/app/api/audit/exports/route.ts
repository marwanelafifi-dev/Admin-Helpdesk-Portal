import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { logServerAudit } from "@/lib/serverAuditLog"

export const runtime = "nodejs"

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

  const body = await request.json().catch(() => null) as {
    format?: unknown
    scope?: unknown
    requestCount?: unknown
    modules?: unknown
  } | null
  const format = typeof body?.format === "string" ? body.format.trim().slice(0, 80) : "Request export"
  const scope = typeof body?.scope === "string" ? body.scope.trim().slice(0, 160) : "Request list"
  const requestCount = Math.max(0, Math.min(100_000, Number(body?.requestCount) || 0))
  const modules = Array.isArray(body?.modules)
    ? body.modules.filter((item): item is string => typeof item === "string").slice(0, 20).join(", ")
    : ""

  logServerAudit({
    actor: session.user.name ?? session.user.email,
    actorEmail: session.user.email,
    action: "request_exported",
    targetId: scope,
    targetTitle: `${scope} export`,
    details: `${format} exported with ${requestCount} request${requestCount === 1 ? "" : "s"}${modules ? `; modules: ${modules}` : ""}.`,
    category: "system",
    outcome: "success",
    path: "/api/audit/exports",
    ipAddress: clientIp(request),
    userAgent: request.headers.get("user-agent")?.slice(0, 500) ?? "",
  })

  return NextResponse.json({ recorded: true })
}
