export async function register() {
  // Only run the backup scheduler in the Node.js runtime (not Edge),
  // and only in production to avoid noise during local dev.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startBackupScheduler } = await import("@/lib/backupCron")
    startBackupScheduler()
  }
}
