import { NextRequest, NextResponse } from "next/server"
import { getToken } from "@auth/core/jwt"
import { canManageDatabase, requestMetadata } from "@/lib/databaseAccess"
import { logServerAudit } from "@/lib/serverAuditLog"
import { readSynologyBackupConfig, requestSynologyBackupRun, updateSynologyBackupSettings } from "@/lib/synologyBackupStore"

export const runtime = "nodejs"

async function actor(req: NextRequest) {
  return getToken({ req, secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET, secureCookie: req.nextUrl.protocol === "https:" })
}

export async function GET(req: NextRequest) {
  const token = await actor(req)
  if (!token || !canManageDatabase({ role: token.role as string | undefined, permissions: token.permissions as string[] | undefined }, "view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  return NextResponse.json({ config: readSynologyBackupConfig(), hostTask: { cadenceMinutes: 5, runsWhileSignedIn: true } })
}

export async function POST(req: NextRequest) {
  const token = await actor(req)
  const principal = { role: token?.role as string | undefined, permissions: token?.permissions as string[] | undefined }
  if (!token || !canManageDatabase(principal, "backup")) {
    if (token) logServerAudit({ actor: String(token.name ?? token.email ?? "Unknown"), actorEmail: String(token.email ?? ""), action: "access_denied", targetId: "synology-backup", targetTitle: "Synology backup", details: "Denied: backup permission required.", category: "access", outcome: "denied", ...requestMetadata(req) })
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const body = await req.json().catch(() => null) as { action?: string; settings?: unknown } | null
  if (!body) return NextResponse.json({ error: "A valid Synology backup request is required." }, { status: 400 })

  const actorName = String(token.name ?? token.email ?? "Unknown")
  const actorEmail = String(token.email ?? "")
  if (body.action === "save") {
    const config = updateSynologyBackupSettings(body.settings)
    logServerAudit({ actor: actorName, actorEmail, action: "database_backup", targetId: "synology-backup", targetTitle: "Synology recovery backup settings", details: `Synology backup ${config.enabled ? "enabled" : "disabled"}; ${config.nasRoot}; ${config.scheduleTime}; retention ${config.retentionDays} days.`, category: "database", outcome: "success", ...requestMetadata(req) })
    return NextResponse.json({ success: true, config })
  }
  if (body.action === "run") {
    const config = requestSynologyBackupRun()
    logServerAudit({ actor: actorName, actorEmail, action: "database_backup", targetId: "synology-backup", targetTitle: "Synology recovery backup requested", details: "Host sync task will run the requested recovery backup within five minutes.", category: "database", outcome: "success", ...requestMetadata(req) })
    return NextResponse.json({ success: true, config })
  }
  return NextResponse.json({ error: "Unsupported Synology backup action." }, { status: 400 })
}
