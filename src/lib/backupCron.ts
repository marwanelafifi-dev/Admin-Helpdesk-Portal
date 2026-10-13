import { notifyBackupHealthIfNeeded } from "@/lib/backupAlertService"

// Backup creation runs in the dedicated backup-worker container. Keeping this
// monitor in the web process preserves alerts without allowing large archives
// to block HTTP requests.
const CHECK_INTERVAL_MS = 5 * 60 * 1000

let started = false

export function startBackupHealthMonitor() {
  if (started) return
  started = true

  console.log("[backup-health] Monitor started — checking every 5 minutes")

  const tick = async () => {
    try {
      await notifyBackupHealthIfNeeded()
    } catch (alertError) {
      console.error("[backup-health] Could not send backup health alert:", alertError)
    }
  }

  setTimeout(tick, 20_000)
  setInterval(tick, CHECK_INTERVAL_MS)
}
