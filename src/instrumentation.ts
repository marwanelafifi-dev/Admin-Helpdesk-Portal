export async function register() {
  // The backup worker owns archive creation. The web process only monitors
  // backup health, so a slow attachment backup cannot block portal traffic.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startBackupHealthMonitor } = await import("@/lib/backupCron")
    const { startAnnouncementScheduler } = await import("@/lib/announcementScheduler")
    const { startFinanceSlaReminderScheduler } = await import("@/lib/financeSlaReminderScheduler")
    startBackupHealthMonitor()
    startAnnouncementScheduler()
    startFinanceSlaReminderScheduler()
  }
}
