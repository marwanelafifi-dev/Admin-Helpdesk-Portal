import { NextRequest, NextResponse } from "next/server"
import { getToken } from "@auth/core/jwt"
import { getBackupHealth, readSchedule, writeSchedule, listBackupFiles } from "@/lib/backupScheduleStore"
import { canManageDatabase, requestMetadata } from "@/lib/databaseAccess"
import { logServerAudit } from "@/lib/serverAuditLog"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    secureCookie: req.nextUrl.protocol === "https:",
  })
  if (!token || !canManageDatabase({ role: token.role as string | undefined, permissions: token.permissions as string[] | undefined }, "view")) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const schedule = readSchedule()
  const files = listBackupFiles()
  return NextResponse.json({ schedule, files, health: getBackupHealth(schedule, files) })
}

export async function POST(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    secureCookie: req.nextUrl.protocol === "https:",
  })
  if (!token || !canManageDatabase({ role: token.role as string | undefined, permissions: token.permissions as string[] | undefined }, "backup")) {
    if (token) logServerAudit({ actor: String(token.name ?? token.email ?? "Unknown"), actorEmail: String(token.email ?? ""), action: "access_denied", targetId: "backup-schedule", targetTitle: "Update backup schedule", details: "Denied: backup permission required.", category: "access", outcome: "denied", ...requestMetadata(req) })
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "A valid backup schedule is required." }, { status: 400 })
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "A valid backup schedule is required." }, { status: 400 })
  }

  // writeSchedule normalizes every supported field and ignores any unrecognized
  // input, keeping runtime schedule data safe even if a client is stale.
  const updated = writeSchedule(body as Parameters<typeof writeSchedule>[0])
  const files = listBackupFiles()
  logServerAudit({
    actor: String(token.name ?? token.email ?? "Unknown"),
    actorEmail: String(token.email ?? ""),
    action: "database_backup",
    targetId: "backup-schedule",
    targetTitle: "Backup schedule updated",
    details: `Automatic backups ${updated.enabled ? "enabled" : "disabled"}; frequencies: ${updated.frequencies.join(", ") || "none"}; retention: ${updated.retentionCount === 0 ? "unlimited" : updated.retentionCount}.`,
    category: "database",
    outcome: "success",
    ...requestMetadata(req),
  })
  return NextResponse.json({ success: true, schedule: updated, files, health: getBackupHealth(updated, files) })
}
