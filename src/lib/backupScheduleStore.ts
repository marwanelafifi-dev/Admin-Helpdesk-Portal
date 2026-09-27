import fs from "fs"
import path from "path"

const SCHEDULE_PATH = path.join(process.cwd(), "data", "backup-schedule.json")
export const BACKUP_DIR = path.join(process.cwd(), "data", "backups")

export type BackupFrequency = "hourly" | "daily" | "weekly" | "monthly"

export interface BackupSchedule {
  enabled: boolean
  /** Multi-select: one or more active frequencies. Replaces legacy `frequency`. */
  frequencies: BackupFrequency[]
  /** @deprecated use frequencies[] — kept for backward-compat with old saved schedules */
  frequency?: BackupFrequency
  /** HH:MM in 24h, used for daily/weekly/monthly */
  time: string
  /** Day of week 0-6 for weekly (0=Sunday) */
  dayOfWeek: number
  /** Day of month 1-28 for monthly */
  dayOfMonth: number
  /** How many backup files to keep (oldest deleted when exceeded). 0 = keep all */
  retentionCount: number
  /** Last successful backup ISO timestamp */
  lastBackupAt: string | null
  /** Last backup filename */
  lastBackupFile: string | null
  /** Last time the runner attempted a backup, whether it succeeded or failed. */
  lastBackupAttemptAt: string | null
  /** Result of the latest backup attempt. */
  lastBackupStatus: "success" | "failure" | null
  /** Last failed backup attempt. Kept separately so a later success can clear the alert. */
  lastBackupFailureAt: string | null
  /** Safe, short operational reason for the most recent failed attempt. */
  lastBackupFailureMessage: string | null
  /** Number of backup attempts that have failed since the last success. */
  consecutiveBackupFailures: number
}

export type BackupHealthStatus = "healthy" | "warning" | "critical" | "disabled"

export interface BackupHealth {
  status: BackupHealthStatus
  label: string
  message: string
  lastSuccessAt: string | null
  lastFailureAt: string | null
  lastFailureMessage: string | null
  consecutiveFailures: number
  expectedWithinHours: number | null
  backupAgeHours: number | null
  fileCount: number
  retentionCount: number
  retentionIssue: boolean
}

export const SCHEDULE_DEFAULTS: BackupSchedule = {
  enabled: false,
  frequencies: ["daily"],
  time: "02:00",
  dayOfWeek: 0,
  dayOfMonth: 1,
  retentionCount: 30,
  lastBackupAt: null,
  lastBackupFile: null,
  lastBackupAttemptAt: null,
  lastBackupStatus: null,
  lastBackupFailureAt: null,
  lastBackupFailureMessage: null,
  consecutiveBackupFailures: 0,
}

const VALID_FREQUENCIES: BackupFrequency[] = ["hourly", "daily", "weekly", "monthly"]

function isBackupFrequency(value: unknown): value is BackupFrequency {
  return typeof value === "string" && VALID_FREQUENCIES.includes(value as BackupFrequency)
}

function validDateString(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value))
}

function normalizeSchedule(saved: unknown): BackupSchedule {
  const source = saved && typeof saved === "object" ? saved as Partial<BackupSchedule> : {}
  const merged: BackupSchedule = { ...SCHEDULE_DEFAULTS, ...source }
  const rawFrequencies = Array.isArray(source.frequencies)
    ? source.frequencies.filter(isBackupFrequency)
    : []
  const legacyFrequency = isBackupFrequency(source.frequency) ? source.frequency : undefined

  merged.frequencies = [...new Set(rawFrequencies.length > 0 ? rawFrequencies : legacyFrequency ? [legacyFrequency] : SCHEDULE_DEFAULTS.frequencies)]
  merged.frequency = legacyFrequency
  merged.enabled = Boolean(source.enabled)
  merged.time = typeof source.time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(source.time)
    ? source.time
    : SCHEDULE_DEFAULTS.time
  merged.dayOfWeek = typeof source.dayOfWeek === "number" && Number.isInteger(source.dayOfWeek) && source.dayOfWeek >= 0 && source.dayOfWeek <= 6
    ? source.dayOfWeek
    : SCHEDULE_DEFAULTS.dayOfWeek
  merged.dayOfMonth = typeof source.dayOfMonth === "number" && Number.isInteger(source.dayOfMonth) && source.dayOfMonth >= 1 && source.dayOfMonth <= 28
    ? source.dayOfMonth
    : SCHEDULE_DEFAULTS.dayOfMonth
  merged.retentionCount = typeof source.retentionCount === "number" && Number.isInteger(source.retentionCount) && source.retentionCount >= 0 && source.retentionCount <= 365
    ? source.retentionCount
    : SCHEDULE_DEFAULTS.retentionCount
  merged.lastBackupAt = validDateString(source.lastBackupAt) ? source.lastBackupAt : null
  merged.lastBackupFile = typeof source.lastBackupFile === "string" && source.lastBackupFile.trim() ? source.lastBackupFile : null
  merged.lastBackupAttemptAt = validDateString(source.lastBackupAttemptAt) ? source.lastBackupAttemptAt : merged.lastBackupAt
  merged.lastBackupStatus = source.lastBackupStatus === "success" || source.lastBackupStatus === "failure" ? source.lastBackupStatus : merged.lastBackupAt ? "success" : null
  merged.lastBackupFailureAt = validDateString(source.lastBackupFailureAt) ? source.lastBackupFailureAt : null
  merged.lastBackupFailureMessage = typeof source.lastBackupFailureMessage === "string" && source.lastBackupFailureMessage.trim()
    ? source.lastBackupFailureMessage.trim().slice(0, 500)
    : null
  merged.consecutiveBackupFailures = typeof source.consecutiveBackupFailures === "number" && Number.isInteger(source.consecutiveBackupFailures) && source.consecutiveBackupFailures > 0
    ? source.consecutiveBackupFailures
    : 0

  return merged
}

export function readSchedule(): BackupSchedule {
  try {
    if (!fs.existsSync(SCHEDULE_PATH)) return { ...SCHEDULE_DEFAULTS }
    const saved = JSON.parse(fs.readFileSync(SCHEDULE_PATH, "utf-8"))
    return normalizeSchedule(saved)
  } catch {
    return { ...SCHEDULE_DEFAULTS }
  }
}

export function writeSchedule(schedule: Partial<BackupSchedule>): BackupSchedule {
  const current = readSchedule()
  const merged = normalizeSchedule({ ...current, ...schedule })
  const hasLastBackupAt = Object.prototype.hasOwnProperty.call(schedule, "lastBackupAt")

  // Existing backupRunner versions update only lastBackupAt/lastBackupFile on a
  // success. Treat that as the authoritative recovery signal and clear any
  // stale failure alert without requiring the runner to know this schema.
  if (hasLastBackupAt && validDateString(schedule.lastBackupAt)) {
    merged.lastBackupAttemptAt = schedule.lastBackupAt
    merged.lastBackupStatus = "success"
    merged.lastBackupFailureAt = null
    merged.lastBackupFailureMessage = null
    merged.consecutiveBackupFailures = 0
  } else if (hasLastBackupAt && schedule.lastBackupAt === null) {
    // Used only when the schedule store is deliberately cleared.
    merged.lastBackupFile = null
    merged.lastBackupAttemptAt = null
    merged.lastBackupStatus = null
    merged.lastBackupFailureAt = null
    merged.lastBackupFailureMessage = null
    merged.consecutiveBackupFailures = 0
  }
  const dir = path.dirname(SCHEDULE_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(SCHEDULE_PATH, JSON.stringify(merged, null, 2), "utf-8")
  return merged
}

/** Persist a scheduler/manual-run failure so the database page can surface it. */
export function recordBackupFailure(error: unknown, attemptedAt = new Date().toISOString()): BackupSchedule {
  const current = readSchedule()
  const rawMessage = error instanceof Error ? error.message : String(error ?? "Unknown backup error")
  const message = rawMessage.replace(/[\r\n\t]+/g, " ").trim().slice(0, 500) || "Unknown backup error"
  return writeSchedule({
    lastBackupAttemptAt: validDateString(attemptedAt) ? attemptedAt : new Date().toISOString(),
    lastBackupStatus: "failure",
    lastBackupFailureAt: validDateString(attemptedAt) ? attemptedAt : new Date().toISOString(),
    lastBackupFailureMessage: message,
    consecutiveBackupFailures: current.consecutiveBackupFailures + 1,
  })
}

export function listBackupFiles(): { filename: string; size: number; createdAt: string }[] {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return []
    return fs.readdirSync(BACKUP_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => {
        const stat = fs.statSync(path.join(BACKUP_DIR, f))
        return { filename: f, size: stat.size, createdAt: stat.mtime.toISOString() }
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  } catch {
    return []
  }
}

function expectedBackupWindowHours(frequencies: BackupFrequency[]): number {
  const windows: Record<BackupFrequency, number> = {
    hourly: 2,
    daily: 26,
    weekly: 8 * 24,
    monthly: 36 * 24,
  }
  return Math.min(...frequencies.map((frequency) => windows[frequency]))
}

/**
 * Returns a non-mutating health assessment for the scheduled-backup system.
 * It deliberately reports both missed backup windows and retention drift so
 * operators can act before a local backup directory becomes unreliable.
 */
export function getBackupHealth(
  schedule = readSchedule(),
  files = listBackupFiles(),
  now = new Date(),
): BackupHealth {
  const expectedWithinHours = schedule.enabled ? expectedBackupWindowHours(schedule.frequencies) : null
  const lastSuccessDate = schedule.lastBackupAt && validDateString(schedule.lastBackupAt) ? new Date(schedule.lastBackupAt) : null
  const backupAgeHours = lastSuccessDate ? Math.max(0, (now.getTime() - lastSuccessDate.getTime()) / (60 * 60 * 1000)) : null
  const retentionIssue = schedule.retentionCount === 0 || files.length > schedule.retentionCount
  const failureIsCurrent = Boolean(
    schedule.lastBackupFailureAt &&
    (!lastSuccessDate || new Date(schedule.lastBackupFailureAt).getTime() >= lastSuccessDate.getTime()),
  )

  if (!schedule.enabled) {
    return {
      status: "disabled",
      label: "Automatic backups are off",
      message: lastSuccessDate
        ? "Automatic backups are disabled. Your last successful local backup is retained, but new changes are not protected automatically."
        : "Automatic backups are disabled and no successful local backup is recorded.",
      lastSuccessAt: schedule.lastBackupAt,
      lastFailureAt: schedule.lastBackupFailureAt,
      lastFailureMessage: schedule.lastBackupFailureMessage,
      consecutiveFailures: schedule.consecutiveBackupFailures,
      expectedWithinHours,
      backupAgeHours,
      fileCount: files.length,
      retentionCount: schedule.retentionCount,
      retentionIssue,
    }
  }

  if (failureIsCurrent) {
    return {
      status: "critical",
      label: "Backup action required",
      message: schedule.lastBackupFailureMessage
        ? `The latest backup attempt failed: ${schedule.lastBackupFailureMessage}`
        : "The latest backup attempt failed. Run a backup now and review the server logs.",
      lastSuccessAt: schedule.lastBackupAt,
      lastFailureAt: schedule.lastBackupFailureAt,
      lastFailureMessage: schedule.lastBackupFailureMessage,
      consecutiveFailures: schedule.consecutiveBackupFailures,
      expectedWithinHours,
      backupAgeHours,
      fileCount: files.length,
      retentionCount: schedule.retentionCount,
      retentionIssue,
    }
  }

  if (!lastSuccessDate) {
    return {
      status: "critical",
      label: "No successful backup yet",
      message: "Automatic backups are enabled, but no successful backup is recorded. Run a backup now to establish recovery protection.",
      lastSuccessAt: null,
      lastFailureAt: schedule.lastBackupFailureAt,
      lastFailureMessage: schedule.lastBackupFailureMessage,
      consecutiveFailures: schedule.consecutiveBackupFailures,
      expectedWithinHours,
      backupAgeHours: null,
      fileCount: files.length,
      retentionCount: schedule.retentionCount,
      retentionIssue,
    }
  }

  if (backupAgeHours !== null && expectedWithinHours !== null && backupAgeHours > expectedWithinHours) {
    return {
      status: "critical",
      label: "Backup is overdue",
      message: `The last successful backup is older than the ${expectedWithinHours}-hour protection window for the active schedule.`,
      lastSuccessAt: schedule.lastBackupAt,
      lastFailureAt: schedule.lastBackupFailureAt,
      lastFailureMessage: schedule.lastBackupFailureMessage,
      consecutiveFailures: schedule.consecutiveBackupFailures,
      expectedWithinHours,
      backupAgeHours,
      fileCount: files.length,
      retentionCount: schedule.retentionCount,
      retentionIssue,
    }
  }

  if (retentionIssue) {
    const message = schedule.retentionCount === 0
      ? "Backup retention is unlimited. Set a finite retention count and monitor the backup volume to avoid exhausting storage."
      : `The backup folder contains ${files.length} files but the retention policy keeps ${schedule.retentionCount}. The next successful backup should prune older files.`
    return {
      status: "warning",
      label: "Retention needs attention",
      message,
      lastSuccessAt: schedule.lastBackupAt,
      lastFailureAt: schedule.lastBackupFailureAt,
      lastFailureMessage: schedule.lastBackupFailureMessage,
      consecutiveFailures: schedule.consecutiveBackupFailures,
      expectedWithinHours,
      backupAgeHours,
      fileCount: files.length,
      retentionCount: schedule.retentionCount,
      retentionIssue,
    }
  }

  return {
    status: "healthy",
    label: "Backup protection is healthy",
    message: `The latest backup is within the ${expectedWithinHours}-hour protection window. ${files.length} local backup${files.length === 1 ? " is" : "s are"} retained.`,
    lastSuccessAt: schedule.lastBackupAt,
    lastFailureAt: schedule.lastBackupFailureAt,
    lastFailureMessage: schedule.lastBackupFailureMessage,
    consecutiveFailures: schedule.consecutiveBackupFailures,
    expectedWithinHours,
    backupAgeHours,
    fileCount: files.length,
    retentionCount: schedule.retentionCount,
    retentionIssue,
  }
}

export function pruneOldBackups(retentionCount: number): number {
  if (retentionCount <= 0) return 0
  const files = listBackupFiles()
  if (files.length <= retentionCount) return 0
  const toDelete = files.slice(retentionCount)
  let deleted = 0
  for (const f of toDelete) {
    try {
      fs.unlinkSync(path.join(BACKUP_DIR, f.filename))
      deleted++
    } catch {}
  }
  return deleted
}
