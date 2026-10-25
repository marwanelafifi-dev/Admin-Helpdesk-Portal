import fs from "fs"
import path from "path"

export interface AdminSlaReminderRecord {
  id: string
  requestId: string
  requestTitle: string
  module: string
  requesterName: string
  slaStartedAt: string
  slaBasis: "submission" | "approval"
  reminderDay: number
  /**
   * The policy under which the reminder was raised. Legacy records have no
   * value because they were calculated in calendar days before 25 Oct 2026.
   * Keeping them intact preserves the operational audit trail while the live
   * queue can use the current working-day policy only.
   */
  calculationMethod?: "working_days"
  sentAt: string
  emailSentAt?: string
  auditLoggedAt?: string
  emailAuditLoggedAt?: string
}

const STORE_PATH = path.join(process.cwd(), "data", "admin-sla-reminders.json")

function readAll(): AdminSlaReminderRecord[] {
  try {
    const dir = path.dirname(STORE_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    if (!fs.existsSync(STORE_PATH)) fs.writeFileSync(STORE_PATH, "[]", "utf-8")
    const parsed = JSON.parse(fs.readFileSync(STORE_PATH, "utf-8"))
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}

function writeAll(records: AdminSlaReminderRecord[]) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(records, null, 2), "utf-8")
}

export function readAdminSlaReminders() { return readAll() }

/** Reminders raised by the current Sunday–Thursday SLA policy. */
export function readCurrentAdminSlaReminders() {
  return readAll().filter((item) => item.calculationMethod === "working_days")
}

export function addAdminSlaReminder(record: AdminSlaReminderRecord) {
  const all = readAll()
  if (all.some((item) => item.id === record.id || (
    item.requestId === record.requestId
    && item.slaStartedAt === record.slaStartedAt
    && item.calculationMethod === record.calculationMethod
  ))) return false
  writeAll([record, ...all])
  return true
}

export function markAdminSlaReminder(reminderId: string, key: "emailSentAt" | "auditLoggedAt" | "emailAuditLoggedAt", value: string) {
  const all = readAll()
  const reminder = all.find((item) => item.id === reminderId)
  if (!reminder || reminder[key]) return false
  reminder[key] = value
  writeAll(all)
  return true
}
