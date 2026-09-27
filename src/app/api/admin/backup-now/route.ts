import { NextRequest, NextResponse } from "next/server"
import { getToken } from "@auth/core/jwt"
import { runBackup } from "@/lib/backupRunner"
import { getBackupHealth, listBackupFiles, readSchedule, recordBackupFailure } from "@/lib/backupScheduleStore"
import { canManageDatabase, requestMetadata } from "@/lib/databaseAccess"
import { logServerAudit } from "@/lib/serverAuditLog"
import { notifyBackupHealthIfNeeded } from "@/lib/backupAlertService"

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

  try {
    const result = await runBackup()
    await notifyBackupHealthIfNeeded()
    logServerAudit({ actor: String(token.name ?? token.email ?? "Unknown"), actorEmail: String(token.email ?? ""), action: "database_backup", targetId: result.filename, targetTitle: "Scheduled backup", details: `Created ${result.filename}; ${result.serverFiles} server stores and ${result.attachmentFiles} attachments.`, category: "database", outcome: "success", ...requestMetadata(req) })
    const files = listBackupFiles()
    try { await notifyBackupHealthIfNeeded() } catch (alertError) { console.error("[backup-now] Could not send backup health alert:", alertError) }
    const schedule = readSchedule()
    return NextResponse.json({ success: true, ...result, files, schedule, health: getBackupHealth(schedule, files) })
  } catch (e: any) {
    let schedule = readSchedule()
    try {
      schedule = recordBackupFailure(e)
    } catch (recordError) {
      console.error("[backup-now] Could not record backup failure:", recordError)
    }
    const files = listBackupFiles()
    logServerAudit({ actor: String(token.name ?? token.email ?? "Unknown"), actorEmail: String(token.email ?? ""), action: "database_backup", targetId: "backup-now", targetTitle: "Scheduled backup", details: `Failed: ${e?.message ?? "unknown error"}`, category: "database", outcome: "failure", ...requestMetadata(req) })
    console.error("[backup-now] Failed:", e?.message)
    return NextResponse.json({ error: e?.message ?? "Backup failed", schedule, files, health: getBackupHealth(schedule, files) }, { status: 500 })
  }
}
