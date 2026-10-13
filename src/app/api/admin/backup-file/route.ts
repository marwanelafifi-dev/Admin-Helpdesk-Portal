import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { Readable } from "stream"
import { getToken } from "@auth/core/jwt"
import { BACKUP_DIR, listBackupFiles } from "@/lib/backupScheduleStore"
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
  const size = fs.statSync(backupPath).size
  // New backups are integrity-checked by the isolated worker before their
  // temporary file is atomically published. Do not re-read/hash a 500+ MB
  // snapshot in the web process merely to download it: that was capable of
  // blocking all portal requests. Restore still validates the manifest.
  const stream = Readable.toWeb(fs.createReadStream(backupPath)) as ReadableStream<Uint8Array>
  logServerAudit({
    actor: String(token.name ?? token.email ?? "Unknown"),
    actorEmail: String(token.email ?? ""),
    action: "database_backup",
    targetId: filename,
    targetTitle: "Download scheduled backup",
    details: "Downloaded scheduled backup; worker verification is performed at creation and again before restore.",
    category: "database",
    outcome: "success",
    ...requestMetadata(req),
  })
  return new NextResponse(stream, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename.replace(/[^a-zA-Z0-9 ._-]/g, "_")}"`,
      "Content-Length": String(size),
      "Cache-Control": "no-store",
      "X-Backup-Integrity": "verified-at-creation",
    },
  })
}
