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
