import fs from "fs"
import path from "path"

const STORE_PATH = path.join(process.cwd(), "data", "synology-backup.json")

export interface SynologyBackupConfig {
  enabled: boolean
  /** UNC destination only. Credentials are held in Windows Credential Manager. */
  nasRoot: string
  /** The Windows host task checks this value every five minutes. */
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
