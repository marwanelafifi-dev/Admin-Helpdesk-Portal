import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { getToken } from "@auth/core/jwt"
import { BACKUP_DIR, listBackupFiles } from "@/lib/backupScheduleStore"
import { verifyBackupFile } from "@/lib/backupRunner"
import { canManageDatabase, requestMetadata } from "@/lib/databaseAccess"
import { logServerAudit } from "@/lib/serverAuditLog"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    secureCookie: req.nextUrl.protocol === "https:",
  })
  // A scheduled backup contains all portal data, so listing the database page
  // alone must not grant permission to export it.
  if (!token || !canManageDatabase({ role: token.role as string | undefined, permissions: token.permissions as string[] | undefined }, "backup")) {
    if (token) {
      logServerAudit({
        actor: String(token.name ?? token.email ?? "Unknown"),
        actorEmail: String(token.email ?? ""),
        action: "access_denied",
        targetId: "backup-file",
        targetTitle: "Download scheduled backup",
        details: "Denied: backup permission required.",
        category: "access",
        outcome: "denied",
        ...requestMetadata(req),
      })
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const filename = req.nextUrl.searchParams.get("name") ?? ""
  // Never turn a user-provided path into a file read. Only a name returned by
  // the controlled backup file list is accepted.
  if (!listBackupFiles().some((file) => file.filename === filename)) {
    return NextResponse.json({ error: "Backup file not found" }, { status: 404 })
  }

  const backupPath = path.join(BACKUP_DIR, filename)
  const integrity = verifyBackupFile(backupPath)
  if (!integrity.valid) {
    // Do not distribute a corrupted or unverifiable signed backup. Legacy
    // backups remain downloadable because the verifier explicitly accepts
    // them with a `legacy` status.
    return NextResponse.json({ error: "Backup integrity check failed", integrity }, { status: 409 })
  }

  const contents = fs.readFileSync(backupPath)
  logServerAudit({
    actor: String(token.name ?? token.email ?? "Unknown"),
    actorEmail: String(token.email ?? ""),
    action: "database_backup",
    targetId: filename,
    targetTitle: "Download scheduled backup",
    details: `Downloaded scheduled backup; integrity status: ${integrity.status}.`,
    category: "database",
    outcome: "success",
    ...requestMetadata(req),
  })
  return new NextResponse(new Uint8Array(contents), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename.replace(/[^a-zA-Z0-9 ._-]/g, "_")}"`,
      "Cache-Control": "no-store",
      "X-Backup-Integrity": integrity.status,
    },
  })
}
