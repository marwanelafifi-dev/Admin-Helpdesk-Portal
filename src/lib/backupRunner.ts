import fs from "fs"
import path from "path"
import crypto from "crypto"
import { BACKUP_DIR, readSchedule, writeSchedule, pruneOldBackups } from "@/lib/backupScheduleStore"
import {
  BACKUP_VERSION,
  DATA_DIR,
  SERVER_BACKUP_FILES,
  collectAttachmentBackupFiles,
} from "@/lib/backupDataRegistry"

/**
 * Integrity information is additive so version 1.2 backups made before this
 * protection was added remain restorable.  The checksum detects accidental
 * corruption; the HMAC prevents someone who does not hold the server secret
 * from silently changing both the backup payload and its checksum.
 */
export interface BackupIntegrityMetadata {
  version: 1
  checksumAlgorithm: "sha256"
  checksum: string
  signatureAlgorithm?: "hmac-sha256"
  signature?: string
}

export type BackupIntegrityStatus = "verified" | "checksum_verified" | "legacy" | "invalid" | "unverifiable"

export interface BackupIntegrityVerification {
  valid: boolean
  status: BackupIntegrityStatus
  message: string
}

type BackupManifestRecord = Record<string, unknown>

function getBackupIntegrityKey(): string | null {
  // BACKUP_INTEGRITY_KEY should be a dedicated, long-lived secret.  The auth
  // secret fallback protects existing deployments immediately while allowing
  // them to move to a separate key without changing the backup format.
  const key = process.env.BACKUP_INTEGRITY_KEY
    ?? process.env.AUTH_SECRET
    ?? process.env.NEXTAUTH_SECRET
  return key?.trim() || null
}

function backupPayloadForIntegrity(manifest: BackupManifestRecord): string {
  const { integrity: _integrity, ...payload } = manifest
  return JSON.stringify(payload)
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex")
}

function hmacSha256(value: string, key: string): string {
  return crypto.createHmac("sha256", key).update(value, "utf8").digest("hex")
}

function safelyCompareHex(expected: string, supplied: unknown): boolean {
  if (typeof supplied !== "string" || !/^[a-f0-9]{64}$/i.test(supplied)) return false
  const expectedBuffer = Buffer.from(expected, "hex")
  const suppliedBuffer = Buffer.from(supplied, "hex")
  return expectedBuffer.length === suppliedBuffer.length && crypto.timingSafeEqual(expectedBuffer, suppliedBuffer)
}

/** Creates checksum/HMAC metadata without including that metadata in the signed payload. */
export function createBackupIntegrity(manifest: BackupManifestRecord): BackupIntegrityMetadata {
  const payload = backupPayloadForIntegrity(manifest)
  const integrity: BackupIntegrityMetadata = {
    version: 1,
    checksumAlgorithm: "sha256",
    checksum: sha256(payload),
  }
  const key = getBackupIntegrityKey()
  if (key) {
    integrity.signatureAlgorithm = "hmac-sha256"
    integrity.signature = hmacSha256(payload, key)
  }
  return integrity
}

/**
 * Validates a parsed scheduled-backup manifest.  Backups from before the
 * integrity field was introduced remain valid as `legacy`; callers can show
 * that status but must not reject them solely for being older.
 */
export function verifyBackupManifestIntegrity(manifest: unknown): BackupIntegrityVerification {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    return { valid: false, status: "invalid", message: "Backup manifest is not an object." }
  }

  const record = manifest as BackupManifestRecord
  if (record.integrity === undefined) {
    return { valid: true, status: "legacy", message: "Legacy backup without integrity metadata." }
  }
  if (!record.integrity || typeof record.integrity !== "object" || Array.isArray(record.integrity)) {
    return { valid: false, status: "invalid", message: "Backup integrity metadata is invalid." }
  }

  const integrity = record.integrity as Partial<BackupIntegrityMetadata>
  if (integrity.version !== 1 || integrity.checksumAlgorithm !== "sha256") {
    return { valid: false, status: "invalid", message: "Backup integrity metadata uses an unsupported format." }
  }

  const payload = backupPayloadForIntegrity(record)
  if (!safelyCompareHex(sha256(payload), integrity.checksum)) {
    return { valid: false, status: "invalid", message: "Backup checksum verification failed." }
  }

  if (integrity.signature === undefined && integrity.signatureAlgorithm === undefined) {
    return { valid: true, status: "checksum_verified", message: "Backup checksum verified; no HMAC signature is present." }
  }
  if (integrity.signatureAlgorithm !== "hmac-sha256") {
    return { valid: false, status: "invalid", message: "Backup signature metadata is invalid." }
  }

  const key = getBackupIntegrityKey()
  if (!key) {
    return { valid: false, status: "unverifiable", message: "A backup integrity key is required to verify this signed backup." }
  }
  if (!safelyCompareHex(hmacSha256(payload, key), integrity.signature)) {
    return { valid: false, status: "invalid", message: "Backup HMAC signature verification failed." }
  }

  return { valid: true, status: "verified", message: "Backup checksum and HMAC signature verified." }
}

/** Verifies a scheduled-backup file without exposing its contents to callers. */
export function verifyBackupFile(filepath: string): BackupIntegrityVerification {
  try {
    return verifyBackupManifestIntegrity(JSON.parse(fs.readFileSync(filepath, "utf8")))
  } catch {
    return { valid: false, status: "invalid", message: "Backup file could not be read as valid JSON." }
  }
}

/** Backup-09-06-2026 - 10.06.45 AM.json  (filesystem-safe, spaces & dots only) */
export function makeBackupFilename(date: Date): string {
  const dd   = String(date.getDate()).padStart(2, "0")
  const mm   = String(date.getMonth() + 1).padStart(2, "0")
  const yyyy = date.getFullYear()
  let   h    = date.getHours()
  const min  = String(date.getMinutes()).padStart(2, "0")
  const sec  = String(date.getSeconds()).padStart(2, "0")
  const ampm = h >= 12 ? "PM" : "AM"
  h = h % 12 || 12
  return `Backup-${dd}-${mm}-${yyyy} - ${String(h).padStart(2, "0")}.${min}.${sec} ${ampm}.json`
}

function readFileSafe(filename: string): unknown {
  try {
    const p = path.join(DATA_DIR, filename)
    if (!fs.existsSync(p)) return null
    return JSON.parse(fs.readFileSync(p, "utf-8"))
  } catch {
    return null
  }
}

export interface BackupResult {
  filename: string
  sizeBytes: number
  serverFiles: number
  attachmentFiles: number
  pruned: number
  integrityStatus: "verified" | "checksum_verified"
}

export async function runBackup(): Promise<BackupResult> {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true })

  const serverData: Record<string, unknown> = {}
  for (const file of SERVER_BACKUP_FILES) {
    const data = readFileSafe(file.filename)
    if (data !== null) serverData[file.filename] = data
  }
  const attachmentFiles = collectAttachmentBackupFiles()

  const unsignedManifest: BackupManifestRecord = {
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    createdBy: "scheduled-backup",
    data: {},
    serverData,
    // Actual uploaded files are deliberately separate from attachment metadata.
    // This lets a scheduled backup be restored completely, not just show file names.
    attachmentFiles,
  }
  const manifest: BackupManifestRecord = {
    ...unsignedManifest,
    integrity: createBackupIntegrity(unsignedManifest),
  }

  const filename = makeBackupFilename(new Date())
  const filepath = path.join(BACKUP_DIR, filename)
  const content = JSON.stringify(manifest, null, 2)
  fs.writeFileSync(filepath, content, "utf-8")

  // Verify the exact bytes just written before recording this as a successful
  // backup.  A corrupt or unexpectedly altered file is removed rather than
  // becoming the latest recoverable snapshot.
  const integrity = verifyBackupFile(filepath)
  if (!integrity.valid || (integrity.status !== "verified" && integrity.status !== "checksum_verified")) {
    try { fs.unlinkSync(filepath) } catch { /* best effort cleanup */ }
    throw new Error(`Backup integrity verification failed: ${integrity.message}`)
  }

  const schedule = readSchedule()
  const pruned = pruneOldBackups(schedule.retentionCount)

  writeSchedule({
    lastBackupAt: new Date().toISOString(),
    lastBackupFile: filename,
  })

  console.log(`[backup] Saved ${filename} (${content.length} bytes, ${attachmentFiles.length} attachment files, integrity ${integrity.status}), pruned ${pruned} old files`)

  return {
    filename,
    sizeBytes: content.length,
    serverFiles: Object.keys(serverData).length,
    attachmentFiles: attachmentFiles.length,
    pruned,
    integrityStatus: integrity.status,
  }
}

/**
 * Returns true if a scheduled backup should run right now based on the
 * schedule config and the last backup timestamp.
 */
function isDueForFrequency(
  freq: string,
  now: Date,
  last: Date | null,
  schedule: ReturnType<typeof readSchedule>,
): boolean {
  if (freq === "hourly") {
    if (!last) return true
    return (now.getTime() - last.getTime()) >= 60 * 60 * 1000
  }

  const [hh, mm] = schedule.time.split(":").map(Number)
  const scheduledToday = new Date(now)
  scheduledToday.setHours(hh, mm, 0, 0)

  if (freq === "daily") {
    if (!last) return now >= scheduledToday
    return now >= scheduledToday && last < scheduledToday
  }

  if (freq === "weekly") {
    if (now.getDay() !== schedule.dayOfWeek) return false
    if (!last) return now >= scheduledToday
    return now >= scheduledToday && last < scheduledToday
  }

  if (freq === "monthly") {
    if (now.getDate() !== schedule.dayOfMonth) return false
    if (!last) return now >= scheduledToday
    return now >= scheduledToday && last < scheduledToday
  }

  return false
}

export function shouldRunNow(schedule: ReturnType<typeof readSchedule>): boolean {
  if (!schedule.enabled) return false
  const now  = new Date()
  const last = schedule.lastBackupAt ? new Date(schedule.lastBackupAt) : null
  // True if ANY of the active frequencies is due
  return schedule.frequencies.some((f) => isDueForFrequency(f, now, last, schedule))
}
