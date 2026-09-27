/**
 * Server-side data bundle used by the Admin > Database page.
 *
 * GET    -> returns everything that lives in /app/data on the server
 *           (comments, feedback, users, roles) as a single JSON object so
 *           backups can capture it alongside the user's browser localStorage.
 * POST   -> writes those files back from an uploaded backup.
 * DELETE -> clears the user-data files (comments, feedback). Users and
 *           roles are intentionally preserved so admins can't accidentally
 *           lock everyone out of the platform via the Clear All button.
 *
 * Auth-gated with separate view, restore, and purge permissions. Full Access
 * remains authorized for every database operation.
 */

import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { auth } from "@/auth"
import { canManageDatabase, requestMetadata } from "@/lib/databaseAccess"
import { verifyBackupManifestIntegrity } from "@/lib/backupRunner"
import { verifyDatabaseReauth } from "@/lib/databaseReauth"
import { logServerAudit } from "@/lib/serverAuditLog"
import {
  ATTACHMENTS_DIR,
  DATA_DIR,
  SERVER_BACKUP_FILES,
  collectAttachmentBackupFiles,
  clearAttachmentFiles,
  emptyBackupFileValue,
  restoreAttachmentBackupFiles,
} from "@/lib/backupDataRegistry"

export const runtime = "nodejs"

/**
 * A restore replaces a number of independent JSON stores plus the attachment
 * directory.  Keeping a short-lived, server-side point-in-time copy means a
 * malformed archive or a disk error cannot leave the portal in a half
 * restored state.  These snapshots deliberately live outside the normal
 * backup inventory: they are a local safety net, not another source archive.
 */
const RESTORE_SNAPSHOT_DIR = path.join(DATA_DIR, "restore-snapshots")
const MAX_RESTORE_SNAPSHOTS = 10

interface RestoreSnapshotFile {
  filename: string
  existed: boolean
}

interface RestoreSnapshot {
  id: string
  directory: string
  createdAt: string
  files: RestoreSnapshotFile[]
  attachmentsDirectoryExisted: boolean
}

function operationId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function removeDirectoryQuietly(directory: string) {
  try {
    if (fs.existsSync(directory)) fs.rmSync(directory, { recursive: true, force: true })
  } catch {
    // A failed clean-up must never turn a successful restore into a failure.
  }
}

function writeRawFileAtomically(filename: string, rawContents: string) {
  const destination = path.join(DATA_DIR, filename)
  const temporary = `${destination}.${operationId("restore")}.tmp`
  try {
    fs.writeFileSync(temporary, rawContents, "utf-8")
    fs.renameSync(temporary, destination)
  } catch (error) {
    try { if (fs.existsSync(temporary)) fs.rmSync(temporary, { force: true }) } catch {}
    throw error
  }
}

/** Creates a durable snapshot before a restore writes even one store. */
function createPreRestoreSnapshot(): RestoreSnapshot {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(RESTORE_SNAPSHOT_DIR)) fs.mkdirSync(RESTORE_SNAPSHOT_DIR, { recursive: true })

  const id = operationId("pre-restore")
  const stagingDirectory = path.join(RESTORE_SNAPSHOT_DIR, `.${id}.staging`)
  const directory = path.join(RESTORE_SNAPSHOT_DIR, id)
  const snapshotDataDirectory = path.join(stagingDirectory, "data")

  try {
    fs.mkdirSync(snapshotDataDirectory, { recursive: true })
    const files: RestoreSnapshotFile[] = []

    for (const file of SERVER_BACKUP_FILES) {
      if (!file.restorable) continue
      const source = path.join(DATA_DIR, file.filename)
      const existed = fs.existsSync(source)
      files.push({ filename: file.filename, existed })
      if (!existed) continue

      if (!fs.statSync(source).isFile()) {
        throw new Error(`Server data store ${file.filename} is not a file`)
      }
      // Copy the raw file instead of parsing and serializing it so the
      // rollback snapshot preserves the exact state that existed before the
      // restore request began.
      fs.copyFileSync(source, path.join(snapshotDataDirectory, file.filename))
    }

    const attachmentsDirectoryExisted = fs.existsSync(ATTACHMENTS_DIR)
    const attachmentsDirectory = ATTACHMENTS_DIR
    if (attachmentsDirectoryExisted) {
      if (!fs.statSync(attachmentsDirectory).isDirectory()) {
        throw new Error("The attachment store is not a directory")
      }
      fs.cpSync(attachmentsDirectory, path.join(stagingDirectory, "attachments"), { recursive: true })
    }

    const createdAt = new Date().toISOString()
    const snapshot: RestoreSnapshot = { id, directory, createdAt, files, attachmentsDirectoryExisted }
    fs.writeFileSync(path.join(stagingDirectory, "manifest.json"), JSON.stringify(snapshot, null, 2), "utf-8")
    // A rename on the same filesystem makes a complete snapshot appear all at
    // once. If snapshotting fails, the request exits before live data changes.
    fs.renameSync(stagingDirectory, directory)
    return snapshot
  } catch (error) {
    removeDirectoryQuietly(stagingDirectory)
    throw error
  }
}

/** Retain recent recovery points without allowing routine restores to fill disk. */
function prunePreRestoreSnapshots(keepId: string) {
  try {
    if (!fs.existsSync(RESTORE_SNAPSHOT_DIR)) return
    const snapshots = fs.readdirSync(RESTORE_SNAPSHOT_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith("pre-restore-"))
      .map((entry) => {
        const directory = path.join(RESTORE_SNAPSHOT_DIR, entry.name)
        return { directory, id: entry.name, modifiedAt: fs.statSync(directory).mtimeMs }
      })
      .sort((a, b) => b.modifiedAt - a.modifiedAt)

    for (const snapshot of snapshots.slice(MAX_RESTORE_SNAPSHOTS)) {
      if (snapshot.id !== keepId) removeDirectoryQuietly(snapshot.directory)
    }
  } catch {
    // Retention is best-effort; a valid restore snapshot is more important
    // than deleting an older recovery point.
  }
}

function restoreAttachmentsFromSnapshot(snapshot: RestoreSnapshot) {
  const source = path.join(snapshot.directory, "attachments")
  const stageDirectory = `${ATTACHMENTS_DIR}.${operationId("rollback")}.stage`
  const previousDirectory = `${ATTACHMENTS_DIR}.${operationId("rollback")}.previous`
  const attachmentDirectory = ATTACHMENTS_DIR

  try {
    if (snapshot.attachmentsDirectoryExisted) {
      if (!fs.existsSync(source) || !fs.statSync(source).isDirectory()) {
        throw new Error("Pre-restore attachment snapshot is incomplete")
      }
      fs.cpSync(source, stageDirectory, { recursive: true })
    } else {
      fs.mkdirSync(stageDirectory, { recursive: true })
    }

    if (fs.existsSync(attachmentDirectory)) fs.renameSync(attachmentDirectory, previousDirectory)
    fs.renameSync(stageDirectory, attachmentDirectory)
  } catch (error) {
    removeDirectoryQuietly(stageDirectory)
    // If the swap had moved the live directory but had not installed the
    // staged snapshot, put the live directory back before reporting failure.
    try {
      if (!fs.existsSync(attachmentDirectory) && fs.existsSync(previousDirectory)) {
        fs.renameSync(previousDirectory, attachmentDirectory)
      }
    } catch {}
    throw error
  }

  // The successful snapshot is already in place. Failure to clean the
  // displaced directory should not undo a completed rollback.
  removeDirectoryQuietly(previousDirectory)
}

/** Restores the pre-restore state after any write or attachment failure. */
function rollbackPreRestoreSnapshot(snapshot: RestoreSnapshot) {
  const stagedDataDirectory = path.join(DATA_DIR, `.${operationId("rollback-data")}`)
  try {
    fs.mkdirSync(stagedDataDirectory, { recursive: true })

    // Stage every file first. This catches missing/corrupt snapshot files
    // before any live JSON store is replaced.
    for (const file of snapshot.files) {
      if (!file.existed) continue
      const source = path.join(snapshot.directory, "data", file.filename)
      if (!fs.existsSync(source) || !fs.statSync(source).isFile()) {
        throw new Error(`Pre-restore snapshot is missing ${file.filename}`)
      }
      fs.copyFileSync(source, path.join(stagedDataDirectory, file.filename))
    }

    for (const file of snapshot.files) {
      const destination = path.join(DATA_DIR, file.filename)
      if (!file.existed) {
        if (fs.existsSync(destination)) fs.rmSync(destination, { force: true })
        continue
      }
      const contents = fs.readFileSync(path.join(stagedDataDirectory, file.filename), "utf-8")
      writeRawFileAtomically(file.filename, contents)
    }

    restoreAttachmentsFromSnapshot(snapshot)
  } finally {
    removeDirectoryQuietly(stagedDataDirectory)
  }
}

function readFileSafe(filename: string): unknown {
  try {
    const fullPath = path.join(DATA_DIR, filename)
    if (!fs.existsSync(fullPath)) return null
    const raw = fs.readFileSync(fullPath, "utf-8")
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function writeFileSafe(filename: string, contents: unknown): boolean {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    writeRawFileAtomically(filename, JSON.stringify(contents, null, 2))
    return true
  } catch (err) {
    console.error(`[admin/server-data] Failed to write ${filename}:`, err)
    return false
  }
}

export async function GET(req: NextRequest) {
  const session = await auth()
  // This endpoint returns every server store and uploaded attachment. It is an
  // export operation, not merely a database-page view.
  if (!canManageDatabase(session?.user, "backup")) {
    if (session?.user) logServerAudit({ actor: session.user.name ?? session.user.email ?? "Unknown", actorEmail: session.user.email ?? "", action: "access_denied", targetId: "server-data", targetTitle: "Export server data", details: "Denied: backup permission required.", category: "access", outcome: "denied", ...requestMetadata(req) })
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const bundle: Record<string, unknown> = {}
  for (const f of SERVER_BACKUP_FILES) {
    const data = readFileSafe(f.filename)
    if (data !== null) bundle[f.filename] = data
  }
  return NextResponse.json({ data: bundle, attachmentFiles: collectAttachmentBackupFiles() })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || !canManageDatabase(session.user, "restore")) {
    if (session?.user) logServerAudit({ actor: session.user.name ?? session.user.email ?? "Unknown", actorEmail: session.user.email ?? "", action: "database_restore_denied", targetId: "server-data", targetTitle: "Server data restore", details: "Denied: restore permission required.", category: "database", outcome: "denied", ...requestMetadata(req) })
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (!verifyDatabaseReauth(req, session.user).valid) {
    logServerAudit({ actor: session.user?.name ?? session.user?.email ?? "Unknown", actorEmail: session.user?.email ?? "", action: "database_restore_denied", targetId: "server-data", targetTitle: "Server data restore", details: "Denied: a recent password or corporate SSO reauthentication is required.", category: "database", outcome: "denied", ...requestMetadata(req) })
    return NextResponse.json({ error: "Recent password or corporate SSO reauthentication is required before restoring data." }, { status: 428 })
  }

  let body: { data?: Record<string, unknown>; attachmentFiles?: unknown; manifest?: unknown }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }
  // When a complete backup manifest is provided, verify its server-side
  // signature before creating a safety snapshot or changing any live data.
  // Old unsigned exports remain restorable for compatibility, but signed
  // scheduled backups cannot be silently modified between download and restore.
  if (body.manifest !== undefined) {
    const verification = verifyBackupManifestIntegrity(body.manifest)
    if (!verification.valid) {
      const actor = session?.user?.name ?? session?.user?.email ?? "Unknown"
      const actorEmail = session?.user?.email ?? ""
      logServerAudit({
        actor,
        actorEmail,
        action: "database_restore",
        targetId: "server-data",
        targetTitle: "Server data restore",
        details: `Restore rejected because backup integrity verification failed: ${verification.message}`,
        category: "database",
        outcome: "denied",
        ...requestMetadata(req),
      })
      return NextResponse.json({ error: "Backup integrity check failed", integrity: verification }, { status: 409 })
    }

    const manifest = body.manifest as { serverData?: unknown; attachmentFiles?: unknown }
    body.data = manifest.serverData as Record<string, unknown> | undefined
    body.attachmentFiles = manifest.attachmentFiles
  }

  if (!body.data || typeof body.data !== "object" || Array.isArray(body.data)) {
    return NextResponse.json({ error: "missing_data" }, { status: 400 })
  }

  const actor = session?.user?.name ?? session?.user?.email ?? "Unknown"
  const actorEmail = session?.user?.email ?? ""
  const auditMetadata = requestMetadata(req)
  let snapshot: RestoreSnapshot
  try {
    snapshot = createPreRestoreSnapshot()
    // Keep retention bounded even when the supplied restore archive is later
    // rejected during validation.
    prunePreRestoreSnapshots(snapshot.id)
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown snapshot error"
    logServerAudit({
      actor,
      actorEmail,
      action: "database_restore",
      targetId: "server-data",
      targetTitle: "Server data restore",
      details: `Restore was not started because the required pre-restore snapshot could not be created. ${reason}`,
      category: "database",
      outcome: "failure",
      ...auditMetadata,
    })
    return NextResponse.json({
      error: "Restore was not started because the pre-restore safety snapshot could not be created.",
    }, { status: 500 })
  }

  const restored: string[] = []
  const skipped: string[] = []
  let restoredAttachmentFiles = 0
  let failurePhase: "data" | "attachments" = "data"

  try {
    for (const f of SERVER_BACKUP_FILES) {
      if (!f.restorable) continue
      if (!(f.filename in body.data)) {
        skipped.push(f.filename)
        continue
      }
      if (!writeFileSafe(f.filename, body.data[f.filename])) {
        throw new Error(`Could not write ${f.filename}`)
      }
      restored.push(f.filename)
    }

    // Omitted by version 1.0/1.1 backups: retain current disk files. Version
    // 1.2 snapshots restore the entire attachment tree after validation.
    if (body.attachmentFiles !== undefined) {
      failurePhase = "attachments"
      restoredAttachmentFiles = restoreAttachmentBackupFiles(body.attachmentFiles)
    }

    prunePreRestoreSnapshots(snapshot.id)
    logServerAudit({
      actor,
      actorEmail,
      action: "database_restore",
      targetId: "server-data",
      targetTitle: "Server data restore",
      details: `Restored ${restored.length} stores; ${skipped.length} skipped; ${restoredAttachmentFiles} attachments. Pre-restore safety snapshot: ${snapshot.id}.`,
      category: "database",
      outcome: "success",
      ...auditMetadata,
    })
    return NextResponse.json({
      restored,
      skipped,
      restoredAttachmentFiles,
      preRestoreSnapshot: { id: snapshot.id, createdAt: snapshot.createdAt },
    })
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown restore error"
    let rollbackError: unknown = null
    try {
      rollbackPreRestoreSnapshot(snapshot)
    } catch (rollbackFailure) {
      rollbackError = rollbackFailure
    }

    const rollbackCompleted = rollbackError === null
    const rollbackReason = rollbackError instanceof Error ? rollbackError.message : "Unknown rollback error"
    logServerAudit({
      actor,
      actorEmail,
      action: "database_restore",
      targetId: "server-data",
      targetTitle: "Server data restore",
      details: rollbackCompleted
        ? `Restore failed during ${failurePhase}; the pre-restore snapshot ${snapshot.id} was rolled back successfully. Reason: ${reason}`
        : `Restore failed during ${failurePhase}; automatic rollback from ${snapshot.id} also failed. Restore reason: ${reason}. Rollback reason: ${rollbackReason}`,
      category: "database",
      outcome: "failure",
      ...auditMetadata,
    })

    return NextResponse.json({
      error: rollbackCompleted
        ? "Restore failed. The portal was returned to its pre-restore state."
        : "Restore failed and the automatic rollback could not complete. Do not retry; contact a platform administrator.",
      reason,
      rollbackCompleted,
      preRestoreSnapshot: { id: snapshot.id, createdAt: snapshot.createdAt },
    }, { status: rollbackCompleted && failurePhase === "attachments" ? 400 : 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user || !canManageDatabase(session.user, "purge")) {
    if (session?.user) logServerAudit({ actor: session.user.name ?? session.user.email ?? "Unknown", actorEmail: session.user.email ?? "", action: "access_denied", targetId: "server-data", targetTitle: "Clear server data", details: "Denied: purge permission required.", category: "access", outcome: "denied", ...requestMetadata(req) })
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (!verifyDatabaseReauth(req, session.user).valid) {
    if (session?.user) logServerAudit({ actor: session.user.name ?? session.user.email ?? "Unknown", actorEmail: session.user.email ?? "", action: "access_denied", targetId: "server-data", targetTitle: "Clear server data", details: "Denied: a recent password or corporate SSO reauthentication is required.", category: "access", outcome: "denied", ...requestMetadata(req) })
    return NextResponse.json({ error: "Recent password or corporate SSO reauthentication is required before purging data." }, { status: 428 })
  }

  const requestedFile = req.nextUrl.searchParams.get("file")
  const candidates = requestedFile
    ? SERVER_BACKUP_FILES.filter((file) => file.filename === requestedFile && file.clearable)
    : SERVER_BACKUP_FILES.filter((file) => file.clearable)
  if (requestedFile && candidates.length === 0) {
    return NextResponse.json({ error: "This server data file cannot be cleared" }, { status: 400 })
  }

  const cleared: string[] = []
  for (const file of candidates) {
    if (file.filename === "attachments.json") clearAttachmentFiles()
    if (writeFileSafe(file.filename, emptyBackupFileValue(file.filename))) cleared.push(file.filename)
  }
  logServerAudit({ actor: session?.user?.name ?? session?.user?.email ?? "Unknown", actorEmail: session?.user?.email ?? "", action: "database_clear", targetId: requestedFile ?? "all-clearable-server-data", targetTitle: "Clear server data", details: `Cleared ${cleared.length} server stores.`, category: "database", outcome: "success", ...requestMetadata(req) })
  return NextResponse.json({ cleared })
}
