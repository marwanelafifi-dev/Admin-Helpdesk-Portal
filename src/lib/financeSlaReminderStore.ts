import fs from "fs"
import path from "path"

export interface FinanceSlaReminderRecord {
  id: string
  requestId: string
  requestTitle: string
  module: string
  requesterName: string
  slaStartedAt: string
  slaBasis: "submission" | "approval"
  deadlineDate: string
  sentAt: string
  slaWorkingDays?: number
  reminderWorkingDay?: number
  /** Set only after the Finance mailbox accepts the SLA reminder email. */
  emailSentAt?: string
  /** Durable audit markers prevent duplicate automatic audit records. */
  auditLoggedAt?: string
  emailAuditLoggedAt?: string
}

const STORE_PATH = path.join(process.cwd(), "data", "finance-sla-reminders.json")

function ensureStore() {
  const dir = path.dirname(STORE_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(STORE_PATH)) fs.writeFileSync(STORE_PATH, JSON.stringify([]), "utf-8")
}

export function readFinanceSlaReminders(): FinanceSlaReminderRecord[] {
  try {
    ensureStore()
    const parsed = JSON.parse(fs.readFileSync(STORE_PATH, "utf-8"))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function addFinanceSlaReminder(record: FinanceSlaReminderRecord): boolean {
  const all = readFinanceSlaReminders()
  if (all.some((item) => item.id === record.id || (item.requestId === record.requestId && item.slaStartedAt === record.slaStartedAt))) return false
  fs.writeFileSync(STORE_PATH, JSON.stringify([record, ...all], null, 2), "utf-8")
  return true
}

/** Mark one reminder as delivered to the Finance mailbox. Keeping this with
 * the reminder record makes email delivery durable across scheduler restarts. */
export function markFinanceSlaReminderEmailSent(reminderId: string, sentAt: string): boolean {
  const all = readFinanceSlaReminders()
  const reminder = all.find((item) => item.id === reminderId)
  if (!reminder || reminder.emailSentAt) return false
  reminder.emailSentAt = sentAt
  fs.writeFileSync(STORE_PATH, JSON.stringify(all, null, 2), "utf-8")
  return true
}

export function markFinanceSlaReminderAuditLogged(reminderId: string, kind: "reminder" | "email", loggedAt: string): boolean {
  const all = readFinanceSlaReminders()
  const reminder = all.find((item) => item.id === reminderId)
  const key = kind === "reminder" ? "auditLoggedAt" : "emailAuditLoggedAt"
  if (!reminder || reminder[key]) return false
  reminder[key] = loggedAt
  fs.writeFileSync(STORE_PATH, JSON.stringify(all, null, 2), "utf-8")
  return true
}
