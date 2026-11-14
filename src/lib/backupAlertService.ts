import fs from "fs"
import path from "path"
import { getBackupHealth, listBackupFiles, readSchedule, type BackupHealth } from "@/lib/backupScheduleStore"
import { readUsers } from "@/lib/userStore"
import { serverNotificationStore, type ServerNotification } from "@/lib/serverNotificationStore"
import { sendAnnouncementEmail } from "@/lib/emailService"
import { logServerAudit } from "@/lib/serverAuditLog"
import { readSynologyBackupConfig } from "@/lib/synologyBackupStore"

const STATE_PATH = path.join(process.cwd(), "data", "backup-alert-state.json")

type AlertState = { key?: string; sentAt?: string }
type AlertHealth = Pick<BackupHealth, "status" | "message" | "lastSuccessAt" | "lastFailureAt" | "lastFailureMessage">

function readState(): AlertState {
  try { return JSON.parse(fs.readFileSync(STATE_PATH, "utf8")) as AlertState } catch { return {} }
}

function writeState(state: AlertState) {
  const directory = path.dirname(STATE_PATH)
  if (!fs.existsSync(directory)) fs.mkdirSync(directory, { recursive: true })
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), "utf8")
}

function actionableAlert(health: AlertHealth) {
  if (health.status !== "critical") return null
  const failure = health.lastFailureAt && (!health.lastSuccessAt || new Date(health.lastFailureAt) >= new Date(health.lastSuccessAt))
  if (failure) {
    return {
      key: `failure:${health.lastFailureAt}`,
      title: "Backup failed — action required",
      message: health.lastFailureMessage || "The latest portal backup attempt failed. Run a backup now and review the backup configuration.",
    }
  }
  // An overdue condition is re-alerted once per calendar day until a new
  // successful backup resets it. This avoids five-minute scheduler spam.
  return {
    key: `overdue:${health.lastSuccessAt ?? "never"}:${new Date().toISOString().slice(0, 10)}`,
    title: health.lastSuccessAt ? "Backup overdue — action required" : "No successful backup — action required",
    message: health.message,
  }
}

/**
 * The verified Synology recovery point is production's primary protection.
 * Prefer it over the retired local JSON-backup scheduler whenever it is
 * enabled, otherwise an old hourly local schedule can generate a false 2h
 * overdue alert despite a healthy off-device recovery copy.
 */
function synologyRecoveryHealth(): AlertHealth | null {
  const config = readSynologyBackupConfig()
  if (!config.enabled) return null

  const failureIsCurrent = config.lastFailureAt && (!config.lastSuccessAt || new Date(config.lastFailureAt) >= new Date(config.lastSuccessAt))
  if (failureIsCurrent) return {
    status: "critical",
    message: config.lastFailureMessage || "The latest verified Synology recovery backup failed.",
    lastSuccessAt: config.lastSuccessAt,
    lastFailureAt: config.lastFailureAt,
    lastFailureMessage: config.lastFailureMessage,
  }

  if (!config.lastSuccessAt) return {
    status: "critical",
    message: "No verified Synology recovery backup has completed yet.",
    lastSuccessAt: null,
    lastFailureAt: config.lastFailureAt,
    lastFailureMessage: config.lastFailureMessage,
  }

  const windows: Record<typeof config.scheduleFrequency, number> = {
    daily: 26,
    weekly: 8 * 24,
    monthly: 35 * 24,
    yearly: 400 * 24,
  }
  const ageHours = (Date.now() - new Date(config.lastSuccessAt).getTime()) / 3_600_000
  if (ageHours > windows[config.scheduleFrequency]) return {
    status: "critical",
    message: `The last verified Synology recovery backup is older than the ${windows[config.scheduleFrequency]}-hour protection window for the active ${config.scheduleFrequency} schedule.`,
    lastSuccessAt: config.lastSuccessAt,
    lastFailureAt: config.lastFailureAt,
    lastFailureMessage: config.lastFailureMessage,
  }

  return {
    status: "healthy",
    message: "The verified Synology recovery backup is within its protection window.",
    lastSuccessAt: config.lastSuccessAt,
    lastFailureAt: config.lastFailureAt,
    lastFailureMessage: config.lastFailureMessage,
  }
}

async function postTeamsAlert(title: string, message: string) {
  const webhook = process.env.TEAMS_WEBHOOK_URL?.trim()
  if (!webhook) return "not_configured" as const
  if (!/^https:\/\//i.test(webhook)) throw new Error("TEAMS_WEBHOOK_URL must use HTTPS")
  const response = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      "@type": "MessageCard",
      "@context": "https://schema.org/extensions",
      themeColor: "DC2626",
      summary: title,
      title: `Si-Ware Company Portal: ${title}`,
      text: `${message}\n\nOpen Platform Administration → Database to review and recover.`,
    }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) throw new Error(`Teams webhook returned ${response.status}`)
  return "sent" as const
}

/**
 * Sends one durable alert per distinct backup failure and one overdue alert per
 * day. In-app delivery is always attempted; SMTP and Teams are optional and
 * never interrupt the backup scheduler.
 */
export async function notifyBackupHealthIfNeeded() {
  const health = synologyRecoveryHealth() ?? getBackupHealth(readSchedule(), listBackupFiles())
  const alert = actionableAlert(health)
  const previous = readState()
  if (!alert) {
    if (previous.key) writeState({})
    return { alerted: false, health }
  }
  if (previous.key === alert.key) return { alerted: false, health }

  // Write before delivery to prevent two scheduler ticks from notifying the
  // same failure concurrently. The in-app record is persistent per recipient.
  writeState({ key: alert.key, sentAt: new Date().toISOString() })
  const configuredEmails = readSynologyBackupConfig().backupAlertRecipientEmails
  const activeUsers = readUsers().filter((user) => user.active && user.email)
  // Existing installations keep their Full Access delivery until an
  // administrator saves an explicit recipient selection.
  const recipients = configuredEmails === null
    ? activeUsers.filter((user) => user.role === "Full Access")
    : activeUsers.filter((user) => configuredEmails.includes(user.email.toLowerCase()))
  const notifications: ServerNotification[] = recipients.map((user) => ({
    id: `backup-alert-${alert.key}-${user.id}`.replace(/[^a-zA-Z0-9_-]/g, "-"),
    userId: user.id,
    type: "system",
    title: alert.title,
    description: alert.message,
    actionUrl: "/admin/database",
    functionIds: ["admin"],
    createdAt: new Date().toISOString(),
    read: false,
  }))
  serverNotificationStore.addMany(notifications)

  let email = "not_configured"
  try {
    const emails = [...new Set(recipients.map((user) => user.email).filter(Boolean))]
    if (emails.length) {
      await sendAnnouncementEmail({
        to: emails,
        subject: `[Action required] ${alert.title}`,
        body: `${alert.message}\n\nOpen Platform Administration → Database to review the backup health and take action.`,
        functionId: "admin",
      })
      email = "sent"
    }
  } catch (error) {
    email = "failed"
    console.error("[backup-alert] Email delivery failed:", error)
  }

  let teams = "not_configured"
  try {
    teams = await postTeamsAlert(alert.title, alert.message)
  } catch (error) {
    teams = "failed"
    console.error("[backup-alert] Teams delivery failed:", error)
  }
  logServerAudit({
    actor: "System",
    actorEmail: "",
    action: "system_event",
    targetId: alert.key,
    targetTitle: "Backup health alert",
    details: `${alert.title}. In-app recipients: ${recipients.length}; email: ${email}; Teams: ${teams}.`,
    category: "system",
    outcome: email === "failed" || teams === "failed" ? "failure" : "success",
  })
  return { alerted: true, health, email, teams }
}
