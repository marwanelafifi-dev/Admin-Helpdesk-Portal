import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { canManageDatabase, requestMetadata } from "@/lib/databaseAccess"
import { verifyDatabaseReauth } from "@/lib/databaseReauth"
import { logServerAudit } from "@/lib/serverAuditLog"
import { readSynologyBackupHistory, requestSynologyRestore } from "@/lib/synologyBackupStore"

export const runtime = "nodejs"

/**
 * The browser can choose only a backup advertised by the host-maintained
 * verified index. It cannot supply a NAS path or a restore command.
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || !canManageDatabase(session.user, "restore")) {
    if (session?.user) logServerAudit({
      actor: session.user.name ?? session.user.email ?? "Unknown",
      actorEmail: session.user.email ?? "",
      action: "database_restore_denied",
      targetId: "synology-restore",
      targetTitle: "Synology recovery restore",
      details: "Denied: restore permission required.",
      category: "database",
      outcome: "denied",
      ...requestMetadata(req),
    })
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (!verifyDatabaseReauth(req, session.user).valid) {
    return NextResponse.json({ error: "Recent password or corporate SSO reauthentication is required before restoring data." }, { status: 428 })
  }

  const body = await req.json().catch(() => null) as { manifest?: unknown; confirmation?: unknown; safetyAcknowledged?: unknown } | null
  if (!body || typeof body.manifest !== "string" || typeof body.confirmation !== "string" || body.safetyAcknowledged !== true) {
    return NextResponse.json({ error: "A restore version and the exact confirmation phrase are required." }, { status: 400 })
  }
  const entry = readSynologyBackupHistory().find((candidate) => candidate.manifest === body.manifest)
  if (!entry) return NextResponse.json({ error: "That Synology backup is no longer in the verified recovery history." }, { status: 404 })
  const expectedConfirmation = `RESTORE ${entry.createdAt}`
  if (body.confirmation.trim() !== expectedConfirmation) {
    return NextResponse.json({ error: `Type exactly: ${expectedConfirmation}` }, { status: 400 })
  }

  try {
    const status = requestSynologyRestore(entry, session.user.email ?? session.user.name ?? "Unknown")
    logServerAudit({
      actor: session.user.name ?? session.user.email ?? "Unknown",
      actorEmail: session.user.email ?? "",
      action: "database_restore",
      targetId: status.id,
      targetTitle: "Synology recovery restore queued",
      details: `Restore requested for ${entry.createdAt}. The host must create and verify a fresh Synology safety backup before changing live data.`,
      category: "database",
      outcome: "success",
      ...requestMetadata(req),
    })
    return NextResponse.json({ success: true, status })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not queue the Synology restore." }, { status: 409 })
  }
}
