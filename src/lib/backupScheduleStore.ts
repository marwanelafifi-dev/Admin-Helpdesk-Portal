import fs from "fs"
import path from "path"

const SCHEDULE_PATH = path.join(process.cwd(), "data", "backup-schedule.json")
export const BACKUP_DIR = path.join(process.cwd(), "backups")

export interface BackupSchedule {
  enabled: boolean
  /** "daily" | "weekly" | "monthly" | "hourly" */
  frequency: "hourly" | "daily" | "weekly" | "monthly"
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
}

export const SCHEDULE_DEFAULTS: BackupSchedule = {
  enabled: false,
  frequency: "daily",
  time: "02:00",
  dayOfWeek: 0,
  dayOfMonth: 1,
  retentionCount: 30,
  lastBackupAt: null,
  lastBackupFile: null,
}

export function readSchedule(): BackupSchedule {
  try {
    if (!fs.existsSync(SCHEDULE_PATH)) return SCHEDULE_DEFAULTS
    return { ...SCHEDULE_DEFAULTS, ...JSON.parse(fs.readFileSync(SCHEDULE_PATH, "utf-8")) }
  } catch {
    return SCHEDULE_DEFAULTS
  }
}

export function writeSchedule(schedule: Partial<BackupSchedule>): BackupSchedule {
  const current = readSchedule()
  const merged = { ...current, ...schedule }
  const dir = path.dirname(SCHEDULE_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(SCHEDULE_PATH, JSON.stringify(merged, null, 2), "utf-8")
  return merged
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
