import { readSchedule } from "@/lib/backupScheduleStore"
import { runBackup, shouldRunNow } from "@/lib/backupRunner"

// Check every 5 minutes whether a scheduled backup is due.
const CHECK_INTERVAL_MS = 5 * 60 * 1000

let started = false

export function startBackupScheduler() {
  if (started) return
  started = true

  console.log("[backup-cron] Scheduler started — checking every 5 minutes")

  const tick = async () => {
    try {
      const schedule = readSchedule()
      if (shouldRunNow(schedule)) {
        console.log("[backup-cron] Running scheduled backup...")
        const result = await runBackup()
        console.log(`[backup-cron] Backup complete: ${result.filename} (${result.sizeBytes} bytes)`)
      }
    } catch (err) {
      console.error("[backup-cron] Error during scheduled backup:", err)
    }
  }

  // Run once on startup in case we missed a window during a restart
  setTimeout(tick, 10_000)
  setInterval(tick, CHECK_INTERVAL_MS)
}
