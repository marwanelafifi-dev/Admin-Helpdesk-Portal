import fs from "fs"
import path from "path"
import crypto from "crypto"

const STORE_PATH = path.join(process.cwd(), "data", "synology-backup.json")
const HISTORY_PATH = path.join(process.cwd(), "data", "synology-backup-history.json")
const RESTORE_REQUEST_PATH = path.join(process.cwd(), "data", "synology-restore-request.json")
const RESTORE_STATUS_PATH = path.join(process.cwd(), "data", "synology-restore-status.json")
const HISTORY_LIMIT = 50

export interface SynologyBackupConfig {
  enabled: boolean
  /** A Windows UNC destination or the protected Ubuntu mount path. Credentials stay on the backup host. */
  nasRoot: string
  /** The backup host service checks this value every five minutes. */
  scheduleTime: string
  retentionDays: number
  pruneOldBackups: boolean
  runRequestedAt: string | null
  lastRequestHandledAt: string | null
  lastStartedAt: string | null
  lastSuccessAt: string | null
  lastFailureAt: string | null
  lastFailureMessage: string | null
  lastPostgresDump: string | null
}

/**
 * Written by the backup host only after the final NAS PostgreSQL dump has
 * passed gzip validation.  The web application reads this local index rather
 * than browsing the NAS share, which keeps the portal isolated from NAS
 * credentials and avoids a slow network request on every page load.
 */
export interface SynologyBackupHistoryEntry {
  createdAt: string
  trigger: "scheduled" | "manual"
  postgresDump: string
  postgresDumpBytes: number
  postgresDumpSha256: string
  manifest: string
  appDataDestination: string
  /** Present for recovery format v3 and later. A versioned, verified archive is required for an exact restore. */
  dataArchive: string | null
  dataArchiveBytes: number | null
  dataArchiveSha256: string | null
  sourceAttachmentCount: number | null
  destinationAttachmentCount: number | null
}

export interface SynologyRestoreStatus {
  id: string
  status: "queued" | "creating_safety_backup" | "validating" | "restoring" | "verifying" | "succeeded" | "failed"
  requestedAt: string
  requestedBy: string
  targetManifest: string
  targetCreatedAt: string
  message: string
  startedAt: string | null
  completedAt: string | null
  /** The new, verified Synology point created immediately before a restore. */
  safetyBackupManifest: string | null
}

export const SYNOLOGY_BACKUP_DEFAULTS: SynologyBackupConfig = {
  enabled: true,
  nasRoot: "\\\\192.168.2.204\\Si-Ware Apps\\Company Portal",
  scheduleTime: "02:30",
  retentionDays: 180,
  pruneOldBackups: true,
  runRequestedAt: null,
  lastRequestHandledAt: null,
  lastStartedAt: null,
  lastSuccessAt: null,
  lastFailureAt: null,
  lastFailureMessage: null,
  lastPostgresDump: null,
}

function isDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value))
}

function safeNasRoot(value: unknown): string {
  if (typeof value !== "string") return SYNOLOGY_BACKUP_DEFAULTS.nasRoot
  const candidate = value.trim()
  if (candidate.length > 260 || candidate.includes("..") || /[\r\n\0]/.test(candidate)) {
    return SYNOLOGY_BACKUP_DEFAULTS.nasRoot
  }
  if (candidate.startsWith("\\\\")) {
    const parts = candidate.slice(2).split("\\").filter(Boolean)
    return parts.length >= 2 ? candidate.replace(/\\+$/, "") : SYNOLOGY_BACKUP_DEFAULTS.nasRoot
  }
  // Ubuntu host: the NAS share is mounted outside the container, and this is
  // the allowed local destination below that protected mount point.
  if (candidate.startsWith("/") && !candidate.includes("\\")) return candidate.replace(/\/+$/, "") || "/"
  return SYNOLOGY_BACKUP_DEFAULTS.nasRoot
}

function safeTime(value: unknown): string {
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return SYNOLOGY_BACKUP_DEFAULTS.scheduleTime
  // The host task polls every five minutes, so keep the selected time reachable.
  return Number(value.slice(3)) % 5 === 0 ? value : SYNOLOGY_BACKUP_DEFAULTS.scheduleTime
}

function safeRetention(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 30 && value <= 3650
    ? value
    : SYNOLOGY_BACKUP_DEFAULTS.retentionDays
}

function normalize(saved: unknown): SynologyBackupConfig {
  const source = saved && typeof saved === "object" && !Array.isArray(saved) ? saved as Partial<SynologyBackupConfig> : {}
  return {
    enabled: typeof source.enabled === "boolean" ? source.enabled : SYNOLOGY_BACKUP_DEFAULTS.enabled,
    nasRoot: safeNasRoot(source.nasRoot),
    scheduleTime: safeTime(source.scheduleTime),
    retentionDays: safeRetention(source.retentionDays),
    pruneOldBackups: typeof source.pruneOldBackups === "boolean" ? source.pruneOldBackups : SYNOLOGY_BACKUP_DEFAULTS.pruneOldBackups,
    runRequestedAt: isDate(source.runRequestedAt) ? source.runRequestedAt : null,
    lastRequestHandledAt: isDate(source.lastRequestHandledAt) ? source.lastRequestHandledAt : null,
    lastStartedAt: isDate(source.lastStartedAt) ? source.lastStartedAt : null,
    lastSuccessAt: isDate(source.lastSuccessAt) ? source.lastSuccessAt : null,
    lastFailureAt: isDate(source.lastFailureAt) ? source.lastFailureAt : null,
    lastFailureMessage: typeof source.lastFailureMessage === "string" ? source.lastFailureMessage.slice(0, 500) : null,
    lastPostgresDump: typeof source.lastPostgresDump === "string" ? source.lastPostgresDump.slice(0, 500) : null,
  }
}

export function readSynologyBackupConfig(): SynologyBackupConfig {
  try {
    if (!fs.existsSync(STORE_PATH)) return { ...SYNOLOGY_BACKUP_DEFAULTS }
    return normalize(JSON.parse(fs.readFileSync(STORE_PATH, "utf8")))
  } catch {
    return { ...SYNOLOGY_BACKUP_DEFAULTS }
  }
}

function validHistoryEntry(value: unknown): value is SynologyBackupHistoryEntry {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const entry = value as Partial<SynologyBackupHistoryEntry>
  return isDate(entry.createdAt)
    && (entry.trigger === "scheduled" || entry.trigger === "manual")
    && typeof entry.postgresDump === "string" && entry.postgresDump.length > 0 && entry.postgresDump.length <= 500
    && typeof entry.postgresDumpBytes === "number" && Number.isSafeInteger(entry.postgresDumpBytes) && entry.postgresDumpBytes > 0
    && typeof entry.postgresDumpSha256 === "string" && /^[a-f0-9]{64}$/i.test(entry.postgresDumpSha256)
    && typeof entry.manifest === "string" && entry.manifest.length > 0 && entry.manifest.length <= 500
    && typeof entry.appDataDestination === "string" && entry.appDataDestination.length > 0 && entry.appDataDestination.length <= 500
    && (entry.dataArchive === null || (typeof entry.dataArchive === "string" && entry.dataArchive.length > 0 && entry.dataArchive.length <= 500))
    && (entry.dataArchiveBytes === null || (typeof entry.dataArchiveBytes === "number" && Number.isSafeInteger(entry.dataArchiveBytes) && entry.dataArchiveBytes > 0))
    && (entry.dataArchiveSha256 === null || (typeof entry.dataArchiveSha256 === "string" && /^[a-f0-9]{64}$/i.test(entry.dataArchiveSha256)))
    && (entry.sourceAttachmentCount === null || (typeof entry.sourceAttachmentCount === "number" && Number.isSafeInteger(entry.sourceAttachmentCount) && entry.sourceAttachmentCount >= 0))
    && (entry.destinationAttachmentCount === null || (typeof entry.destinationAttachmentCount === "number" && Number.isSafeInteger(entry.destinationAttachmentCount) && entry.destinationAttachmentCount >= 0))
}

export function readSynologyBackupHistory(): SynologyBackupHistoryEntry[] {
  try {
    if (!fs.existsSync(HISTORY_PATH)) return []
    const saved = JSON.parse(fs.readFileSync(HISTORY_PATH, "utf8")) as { entries?: unknown }
    if (!Array.isArray(saved.entries)) return []
    return saved.entries
      .map((entry) => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) return entry
        // v2 history entries predate immutable data archives. Keep them visible
        // while making their restore-ineligible state explicit to callers.
        const source = entry as Record<string, unknown>
        return {
          ...source,
          dataArchive: source.dataArchive ?? null,
          dataArchiveBytes: source.dataArchiveBytes ?? null,
          dataArchiveSha256: source.dataArchiveSha256 ?? null,
        }
      })
      .filter(validHistoryEntry)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, HISTORY_LIMIT)
  } catch {
    // A damaged status index must never make the administration page fail.
    return []
  }
}

function safeRestoreStatus(value: unknown): SynologyRestoreStatus | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const source = value as Partial<SynologyRestoreStatus>
  const states: SynologyRestoreStatus["status"][] = ["queued", "creating_safety_backup", "validating", "restoring", "verifying", "succeeded", "failed"]
  if (typeof source.id !== "string" || !/^[a-f0-9-]{16,80}$/i.test(source.id)
    || !states.includes(source.status as SynologyRestoreStatus["status"])
    || !isDate(source.requestedAt)
    || typeof source.requestedBy !== "string" || source.requestedBy.length > 320
    || typeof source.targetManifest !== "string" || source.targetManifest.length === 0 || source.targetManifest.length > 500
    || !isDate(source.targetCreatedAt)
    || typeof source.message !== "string" || source.message.length > 1000) return null
  return {
    id: source.id,
    status: source.status as SynologyRestoreStatus["status"],
    requestedAt: source.requestedAt,
    requestedBy: source.requestedBy,
    targetManifest: source.targetManifest,
    targetCreatedAt: source.targetCreatedAt,
    message: source.message,
    startedAt: isDate(source.startedAt) ? source.startedAt : null,
    completedAt: isDate(source.completedAt) ? source.completedAt : null,
    safetyBackupManifest: typeof source.safetyBackupManifest === "string" && source.safetyBackupManifest.length <= 500 ? source.safetyBackupManifest : null,
  }
}

export function readSynologyRestoreStatus(): SynologyRestoreStatus | null {
  try {
    if (!fs.existsSync(RESTORE_STATUS_PATH)) return null
    return safeRestoreStatus(JSON.parse(fs.readFileSync(RESTORE_STATUS_PATH, "utf8")))
  } catch {
    return null
  }
}

function writeJsonAtomically(target: string, value: unknown) {
  fs.mkdirSync(path.dirname(target), { recursive: true })
  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`
  fs.writeFileSync(temporary, JSON.stringify(value, null, 2), "utf8")
  fs.renameSync(temporary, target)
}

/** Queue only a host-side operation. The portal container never receives NAS or Docker control. */
export function requestSynologyRestore(entry: SynologyBackupHistoryEntry, requestedBy: string) {
  const existing = readSynologyRestoreStatus()
  if (existing && ["queued", "creating_safety_backup", "validating", "restoring", "verifying"].includes(existing.status)) {
    throw new Error("A Synology restore is already queued or in progress.")
  }
  if (!entry.dataArchive || !entry.dataArchiveBytes || !entry.dataArchiveSha256) {
    throw new Error("This older backup has no versioned portal-data archive and cannot be used for an exact restore.")
  }
  const status: SynologyRestoreStatus = {
    id: crypto.randomUUID(),
    status: "queued",
    requestedAt: new Date().toISOString(),
    requestedBy: requestedBy.slice(0, 320),
    targetManifest: entry.manifest,
    targetCreatedAt: entry.createdAt,
    message: "Queued. The host will create and verify a fresh Synology safety backup before restoring this version.",
    startedAt: null,
    completedAt: null,
    safetyBackupManifest: null,
  }
  writeJsonAtomically(RESTORE_REQUEST_PATH, status)
  writeJsonAtomically(RESTORE_STATUS_PATH, status)
  return status
}

export function writeSynologyBackupConfig(update: Partial<SynologyBackupConfig>): SynologyBackupConfig {
  const current = readSynologyBackupConfig()
  const next = normalize({ ...current, ...update })
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true })
  const temporary = `${STORE_PATH}.${process.pid}.${Date.now()}.tmp`
  fs.writeFileSync(temporary, JSON.stringify(next, null, 2), "utf8")
  fs.renameSync(temporary, STORE_PATH)
  return next
}

/** Only UI-editable settings are accepted here; host execution state is host-owned. */
export function updateSynologyBackupSettings(input: unknown): SynologyBackupConfig {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input as Partial<SynologyBackupConfig> : {}
  return writeSynologyBackupConfig({
    enabled: typeof source.enabled === "boolean" ? source.enabled : readSynologyBackupConfig().enabled,
    nasRoot: safeNasRoot(source.nasRoot),
    scheduleTime: safeTime(source.scheduleTime),
    retentionDays: safeRetention(source.retentionDays),
    pruneOldBackups: typeof source.pruneOldBackups === "boolean" ? source.pruneOldBackups : readSynologyBackupConfig().pruneOldBackups,
  })
}

export function requestSynologyBackupRun(): SynologyBackupConfig {
  return writeSynologyBackupConfig({ runRequestedAt: new Date().toISOString() })
}
