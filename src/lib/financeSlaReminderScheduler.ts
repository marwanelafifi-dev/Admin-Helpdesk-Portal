import { roleToFunctionId } from "@/lib/functionRegistry"
import { addFinanceSlaReminder } from "@/lib/financeSlaReminderStore"
import { requestStore } from "@/lib/requestStore"
import { serverNotificationStore, type ServerNotification } from "@/lib/serverNotificationStore"
import { loadSettingsServer } from "@/lib/settingsServer"
import { readUsers } from "@/lib/userStore"
import { normalizeFinanceReminderDay, normalizeFinanceSlaDays } from "@/modules/finance/financeSla"
import type { EngineRequest } from "@/services/engineService"

const CHECK_INTERVAL_MS = 60 * 60 * 1000
const FINANCE_MODULES = new Set(["finance_reimbursement", "finance_travel_reimbursement", "finance_invoice_payment"])
const TERMINAL_STATUSES = new Set(["completed", "cancelled", "delivered", "rejected"])
const CAIRO_TIME_ZONE = "Africa/Cairo"

type LocalDate = { year: number; month: number; day: number }
type SlaStart = { at: string; basis: "submission" | "approval" }

let started = false

function cairoDate(value: Date): LocalDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CAIRO_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(value)
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((item) => item.type === type)?.value)
  return { year: part("year"), month: part("month"), day: part("day") }
}

function dateKey(value: LocalDate): string {
  return `${value.year}-${String(value.month).padStart(2, "0")}-${String(value.day).padStart(2, "0")}`
}

function addCalendarDay(value: LocalDate): LocalDate {
  const next = new Date(Date.UTC(value.year, value.month - 1, value.day + 1))
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() }
}

function isWorkingDay(value: LocalDate): boolean {
  const weekday = new Date(Date.UTC(value.year, value.month - 1, value.day)).getUTCDay()
  return weekday !== 5 && weekday !== 6
}

function addWorkingDays(value: LocalDate, count: number): LocalDate {
  let current = value
  let added = 0
  while (added < count) {
    current = addCalendarDay(current)
    if (isWorkingDay(current)) added += 1
  }
  return current
}

function approvalReceivedAt(request: EngineRequest): string | null {
  const history = [...(request.statusHistory ?? [])].sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime())
  for (let index = 0; index < history.length; index += 1) {
    const entry = history[index]
    if (String(entry.status) !== "in_progress") continue
    const previousWasAwaiting = history.slice(0, index).some((item) => item.status === "awaiting_approval")
    if (previousWasAwaiting || entry.comment?.toLowerCase().includes("approved")) return entry.changedAt
  }
  return null
}

function requestRequiresApproval(request: EngineRequest): boolean {
  const payload = request.payload as Record<string, unknown>
  if (request.module === "finance_travel_reimbursement") return true
  if (request.module === "finance_reimbursement") return payload.poOption === "no_po"
  if (request.module === "finance_invoice_payment") {
    return Boolean(String(payload.approverEmail ?? "").trim() || String(payload.directManagerEmail ?? "").trim() || request.statusHistory?.some((item) => item.status === "awaiting_approval"))
  }
  return false
}

function resolveSlaStart(request: EngineRequest): SlaStart | null {
  const approvedAt = approvalReceivedAt(request)
  if (approvedAt) return { at: approvedAt, basis: "approval" }
  if (requestRequiresApproval(request) || request.status === "awaiting_approval") return null
  return { at: request.createdAt, basis: "submission" }
}

function formatDeadline(date: LocalDate): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short", year: "numeric" })
    .format(new Date(Date.UTC(date.year, date.month - 1, date.day)))
}

export function runFinanceSlaReminderCheck(now = new Date()): number {
  const todayKey = dateKey(cairoDate(now))
  const settings = loadSettingsServer()
  const slaDays = normalizeFinanceSlaDays(settings.financeSlaWorkingDays)
  const reminderDay = normalizeFinanceReminderDay(settings.financeSlaReminderDay, slaDays)
  const daysRemaining = slaDays - reminderDay
  const financeUsers = readUsers().filter((user) => user.active && roleToFunctionId(user.role) === "finance")
  if (financeUsers.length === 0) return 0

  let created = 0
  for (const request of requestStore.getAll()) {
    if (!FINANCE_MODULES.has(request.module) || TERMINAL_STATUSES.has(String(request.status))) continue
    const slaStart = resolveSlaStart(request)
    if (!slaStart || !Number.isFinite(new Date(slaStart.at).getTime())) continue

    const startDate = cairoDate(new Date(slaStart.at))
    const reminderDate = addWorkingDays(startDate, reminderDay)
    if (dateKey(reminderDate) !== todayKey) continue

    const deadlineDate = addWorkingDays(startDate, slaDays)
    const recordId = `FIN-SLA-DAY${reminderDay}-${request.id}-${dateKey(startDate)}`
    const sentAt = now.toISOString()
    const wasAdded = addFinanceSlaReminder({
      id: recordId, requestId: request.id, requestTitle: request.title, module: request.module,
      requesterName: request.requesterName, slaStartedAt: slaStart.at, slaBasis: slaStart.basis,
      deadlineDate: dateKey(deadlineDate), sentAt, slaWorkingDays: slaDays, reminderWorkingDay: reminderDay,
    })
    if (!wasAdded) continue

    const basisText = slaStart.basis === "approval" ? "after approval" : "after submission"
    const notifications: ServerNotification[] = financeUsers.map((user) => ({
      id: `${recordId}-${user.id}`, userId: user.id, type: "finance_sla_reminder",
      title: `${daysRemaining} working ${daysRemaining === 1 ? "day" : "days"} left: ${request.id}`,
      description: `${request.title} has reached working day ${reminderDay} ${basisText}. The ${slaDays}-working-day SLA is due ${formatDeadline(deadlineDate)}.`,
      requestId: request.id, actionUrl: `/departments/finance/requests/${request.id}`,
      functionIds: ["finance"], createdAt: sentAt, read: false,
    }))
    serverNotificationStore.addMany(notifications)
    created += 1
  }
  return created
}

export function startFinanceSlaReminderScheduler() {
  if (started) return
  started = true
  console.log("[finance-sla-reminder] Started - checking every hour")
  const tick = () => {
    try {
      const count = runFinanceSlaReminderCheck()
      if (count > 0) console.log(`[finance-sla-reminder] Created ${count} reminder(s)`)
    } catch (error) {
      console.error("[finance-sla-reminder] Check failed:", error)
    }
  }
  setTimeout(tick, 10_000)
  setInterval(tick, CHECK_INTERVAL_MS)
}
