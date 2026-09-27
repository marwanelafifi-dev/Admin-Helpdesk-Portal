import { readSchedule, recordBackupFailure } from "@/lib/backupScheduleStore"
import { runBackup, shouldRunNow } from "@/lib/backupRunner"
import { notifyBackupHealthIfNeeded } from "@/lib/backupAlertService"

// Check every 5 minutes whether a scheduled backup is due.
const CHECK_INTERVAL_MS = 5 * 60 * 1000

let started = false

export function startBackupScheduler() {
  if (started) return
  started = true

  console.log("[backup-cron] Scheduler started — checking every 5 minutes")

  const tick = async () => {
    let backupWasDue = false
    try {
      const schedule = readSchedule()
      if (shouldRunNow(schedule)) {
        backupWasDue = true
        console.log("[backup-cron] Running scheduled backup...")
        const result = await runBackup()
        console.log(`[backup-cron] Backup complete: ${result.filename} (${result.sizeBytes} bytes)`)
      }
    } catch (err) {
      // Keep a durable health signal for the Database page. The backup runner
      // writes the success state itself; only failures need to be recorded here.
      if (backupWasDue) {
        try {
          recordBackupFailure(err)
        } catch (recordError) {
          console.error("[backup-cron] Could not record backup failure:", recordError)
        }
      }
      console.error("[backup-cron] Error during scheduled backup:", err)
    } finally {
      try {
        await notifyBackupHealthIfNeeded()
      } catch (alertError) {
        console.error("[backup-cron] Could not send backup health alert:", alertError)
      }
    }
  }

  // Run once on startup in case we missed a window during a restart
  setTimeout(tick, 10_000)
  setInterval(tick, CHECK_INTERVAL_MS)
}
