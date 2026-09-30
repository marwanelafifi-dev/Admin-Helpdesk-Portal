/**
 * The authoritative server-side backup inventory.
 *
 * Both on-demand and scheduled backups use this file, and the restore API
 * accepts only these JSON files. Keeping the list here prevents a new
 * function from being included by one backup path but not the other.
 */
import crypto from "crypto"
import fs from "fs"
import path from "path"

export const BACKUP_VERSION = "1.2" as const
export const DATA_DIR = path.join(process.cwd(), "data")
export const ATTACHMENTS_DIR = path.join(DATA_DIR, "attachments")

export interface ServerBackupFile {
  filename: string
  /** A backup restore is permitted to write this file. */
  restorable: boolean
  /** The Database "clear data" operation is permitted to empty this file. */
  clearable: boolean
}

export const SERVER_BACKUP_FILES: readonly ServerBackupFile[] = [
  // Requests for every Administration, HR, and Finance module. Approval
  // histories are stored with each request in requests.json.
  { filename: "requests.json",                 restorable: true, clearable: true },
  { filename: "deleted-requests.json",         restorable: true, clearable: true },
  // Never clear deletion markers alongside requests: stale browsers must not
  // be able to recreate records after a Database Clear or recycle-bin purge.
  { filename: "request-tombstones.json",       restorable: true, clearable: false },
  { filename: "comments.json",                 restorable: true, clearable: true },
  { filename: "attachments.json",              restorable: true, clearable: true },
  { filename: "feedback.json",                 restorable: true, clearable: true },
  { filename: "finance-sla-reminders.json",    restorable: true, clearable: true },

  // Communications, notifications, and the new approval-link audit trail.
  { filename: "announcements.json",            restorable: true, clearable: true },
  { filename: "notifications.json",            restorable: true, clearable: true },
  { filename: "notices.json",                  restorable: true, clearable: true },
  { filename: "user-feedback.json",            restorable: true, clearable: true },
  { filename: "admin-survey.json",             restorable: true, clearable: true },
  { filename: "audit-log.json",                restorable: true, clearable: false },

  // Organisation and platform configuration.
  { filename: "company-data.json",             restorable: true, clearable: true },
  { filename: "company-data-buchi.json",       restorable: true, clearable: true },
  { filename: "platform-settings.json",        restorable: true, clearable: false },
  { filename: "email-config.json",             restorable: true, clearable: false },
  { filename: "maintenance.json",              restorable: true, clearable: false },
  { filename: "backup-schedule.json",          restorable: true, clearable: false },
  { filename: "synology-backup.json",          restorable: true, clearable: false },
  { filename: "browser-data.json",             restorable: true, clearable: true },

  // Keep identities and access control in the disaster-recovery snapshot.
  { filename: "users.json",                    restorable: true, clearable: false },
  { filename: "roles.json",                    restorable: true, clearable: false },
] as const

export interface AttachmentBackupFile {
  /** Path relative to data/attachments, always slash-separated. */
  path: string
  contentBase64: string
  sizeBytes: number
  checksum: string
}

function safeAttachmentPath(relativePath: string): string | null {
  if (!relativePath || relativePath.length > 500 || path.isAbsolute(relativePath)) return null
  const normalized = relativePath.replace(/\\/g, "/")
  if (normalized.split("/").some((part) => !part || part === "." || part === "..")) return null
  const destination = path.resolve(ATTACHMENTS_DIR, normalized)
  const root = `${path.resolve(ATTACHMENTS_DIR)}${path.sep}`
  return destination.startsWith(root) ? destination : null
}

function attachmentFilesFrom(dir: string, prefix = ""): AttachmentBackupFile[] {
  if (!fs.existsSync(dir)) return []
  const result: AttachmentBackupFile[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      result.push(...attachmentFilesFrom(fullPath, relative))
      continue
    }
    if (!entry.isFile()) continue
    const buffer = fs.readFileSync(fullPath)
    result.push({
      path: relative,
      contentBase64: buffer.toString("base64"),
      sizeBytes: buffer.length,
      checksum: crypto.createHash("sha256").update(buffer).digest("hex"),
    })
  }
  return result
}

/** Captures uploaded request/supporting files alongside attachments.json metadata. */
export function collectAttachmentBackupFiles(): AttachmentBackupFile[] {
  return attachmentFilesFrom(ATTACHMENTS_DIR)
}

/** The canonical empty JSON shape for a clearable server store. */
export function emptyBackupFileValue(filename: string): unknown {
  if (filename === "comments.json") return {}
  if (filename === "feedback.json") return { surveys: [], responses: [] }
  if (filename === "announcements.json") return { sent: [], drafts: [], templates: [] }
  if (filename === "company-data.json" || filename === "company-data-buchi.json") {
    return {
      suppliers: [], cost_centers: [], managers: [], authorized_managers: [],
      travel_expense_descriptions: [], carriers: [], departments: [], sectors: [],
    }
  }
  // All other clearable stores currently persist a list. Keeping this default
  // central means a new clearable store cannot accidentally be reset to `{}`.
  return []
}

/** Removes actual uploaded files as well as their metadata when data is cleared. */
export function clearAttachmentFiles(): void {
  if (fs.existsSync(ATTACHMENTS_DIR)) fs.rmSync(ATTACHMENTS_DIR, { recursive: true, force: true })
  fs.mkdirSync(ATTACHMENTS_DIR, { recursive: true })
}

/**
 * Validates every supplied file before replacing the attachment directory.
 * The atomic directory swap means a malformed upload cannot leave a partial
 * restore behind. Limits prevent an administrator endpoint being used to fill
 * the server disk with an arbitrary JSON upload.
 */
export function restoreAttachmentBackupFiles(files: unknown): number {
  if (!Array.isArray(files)) throw new Error("Invalid attachment backup data")
  if (files.length > 10_000) throw new Error("Attachment backup contains too many files")

  const prepared: Array<{ destination: string; buffer: Buffer }> = []
  let totalBytes = 0
  for (const file of files) {
    if (!file || typeof file !== "object") throw new Error("Invalid attachment backup file")
    const item = file as Partial<AttachmentBackupFile>
    const destination = typeof item.path === "string" ? safeAttachmentPath(item.path) : null
    if (!destination || typeof item.contentBase64 !== "string") throw new Error("Invalid attachment backup path")
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(item.contentBase64) || item.contentBase64.length % 4 !== 0) {
      throw new Error("Invalid attachment backup content")
    }
    const buffer = Buffer.from(item.contentBase64, "base64")
    if (typeof item.sizeBytes === "number" && item.sizeBytes !== buffer.length) {
      throw new Error("Attachment backup size check failed")
    }
    if (typeof item.checksum === "string" && crypto.createHash("sha256").update(buffer).digest("hex") !== item.checksum) {
      throw new Error("Attachment backup integrity check failed")
    }
    totalBytes += buffer.length
    if (totalBytes > 250 * 1024 * 1024) throw new Error("Attachment backup exceeds the 250 MB restore limit")
    prepared.push({ destination, buffer })
  }

  const stageDir = `${ATTACHMENTS_DIR}.restore-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const previousDir = `${ATTACHMENTS_DIR}.previous-${Date.now()}`
  try {
    for (const { destination, buffer } of prepared) {
      const relative = path.relative(ATTACHMENTS_DIR, destination)
      const stagedDestination = path.join(stageDir, relative)
      fs.mkdirSync(path.dirname(stagedDestination), { recursive: true })
      fs.writeFileSync(stagedDestination, buffer)
    }
    if (!fs.existsSync(stageDir)) fs.mkdirSync(stageDir, { recursive: true })
    if (fs.existsSync(ATTACHMENTS_DIR)) fs.renameSync(ATTACHMENTS_DIR, previousDir)
    fs.renameSync(stageDir, ATTACHMENTS_DIR)
    if (fs.existsSync(previousDir)) fs.rmSync(previousDir, { recursive: true, force: true })
    return prepared.length
  } catch (error) {
    if (fs.existsSync(stageDir)) fs.rmSync(stageDir, { recursive: true, force: true })
    if (!fs.existsSync(ATTACHMENTS_DIR) && fs.existsSync(previousDir)) fs.renameSync(previousDir, ATTACHMENTS_DIR)
    throw error
  }
}
