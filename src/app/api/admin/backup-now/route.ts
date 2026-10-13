import { NextRequest, NextResponse } from "next/server"
import { getToken } from "@auth/core/jwt"
import { queueManualBackup } from "@/lib/backupJobStore"
import { getBackupHealth, listBackupFiles, readSchedule } from "@/lib/backupScheduleStore"
import { canManageDatabase, requestMetadata } from "@/lib/databaseAccess"
import { logServerAudit } from "@/lib/serverAuditLog"

export const runtime = "nodejs"
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    secureCookie: req.nextUrl.protocol === "https:",
  })
  if (!token || !canManageDatabase({ role: token.role as string | undefined, permissions: token.permissions as string[] | undefined }, "backup")) {
    if (token) logServerAudit({ actor: String(token.name ?? token.email ?? "Unknown"), actorEmail: String(token.email ?? ""), action: "access_denied", targetId: "backup-now", targetTitle: "Run backup", details: "Denied: backup permission required.", category: "access", outcome: "denied", ...requestMetadata(req) })
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { job, alreadyQueued } = queueManualBackup()
  const schedule = readSchedule()
  const files = listBackupFiles()
  logServerAudit({
    actor: String(token.name ?? token.email ?? "Unknown"),
    actorEmail: String(token.email ?? ""),
    action: "database_backup",
    targetId: job.id,
    targetTitle: "Scheduled backup requested",
    details: alreadyQueued ? "Reused the existing queued backup job." : "Queued a backup job for the isolated backup worker.",
    category: "database",
    outcome: "success",
    ...requestMetadata(req),
  })
  return NextResponse.json({ success: true, queued: !alreadyQueued, job, files, schedule, health: getBackupHealth(schedule, files) }, { status: 202 })
}
