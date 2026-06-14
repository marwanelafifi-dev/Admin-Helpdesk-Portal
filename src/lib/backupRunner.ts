import fs from "fs"
import path from "path"
import { BACKUP_DIR, readSchedule, writeSchedule, pruneOldBackups } from "@/lib/backupScheduleStore"

const DATA_DIR = path.join(process.cwd(), "data")

const SERVER_FILES = [
  "requests.json",
  "comments.json",
  "feedback.json",
  "company-data.json",
  "users.json",
  "roles.json",
  "platform-settings.json",
  "backup-schedule.json",
  "email-config.json",
  "browser-data.json",   // browser localStorage snapshot pushed by the client before each backup
]

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
  pruned: number
}

export async function runBackup(): Promise<BackupResult> {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true })

  const serverData: Record<string, unknown> = {}
  for (const f of SERVER_FILES) {
    const data = readFileSafe(f)
    if (data !== null) serverData[f] = data
  }

  const manifest = {
    version: "1.1",
    createdAt: new Date().toISOString(),
    createdBy: "scheduled-backup",
    data: {},
    serverData,
  }

  const ts = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-")
  const filename = `backup-${ts}.json`
  const filepath = path.join(BACKUP_DIR, filename)
  const content = JSON.stringify(manifest, null, 2)
  fs.writeFileSync(filepath, content, "utf-8")

  const schedule = readSchedule()
  const pruned = pruneOldBackups(schedule.retentionCount)

  writeSchedule({
    lastBackupAt: new Date().toISOString(),
    lastBackupFile: filename,
  })

  console.log(`[backup] Saved ${filename} (${content.length} bytes), pruned ${pruned} old files`)

  return {
    filename,
    sizeBytes: content.length,
    serverFiles: Object.keys(serverData).length,
    pruned,
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
