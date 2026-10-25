import { canAccessAdministrationSlaReminders, functionForModule, requiresManagerApproval } from "@/lib/functionRegistry"
import { addAdminSlaReminder, markAdminSlaReminder, readAdminSlaReminders } from "@/lib/adminSlaReminderStore"
import { sendAdminSlaReminderEmail } from "@/lib/emailService"
import { requestStore } from "@/lib/requestStore"
import { serverNotificationStore, type ServerNotification } from "@/lib/serverNotificationStore"
import { loadSettingsServer } from "@/lib/settingsServer"
import { readUsers } from "@/lib/userStore"
import { findRoleByName } from "@/lib/rolesStore"
import { logServerAudit } from "@/lib/serverAuditLog"
import type { EngineRequest } from "@/services/engineService"

const CHECK_INTERVAL_MS = 60 * 60 * 1000
const TERMINAL = new Set(["completed", "cancelled", "delivered", "rejected"])
const CAIRO_TIME_ZONE = "Africa/Cairo"
let started = false
const sending = new Set<string>()

type LocalDate = { year: number; month: number; day: number }

function cairoDate(value: Date): LocalDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CAIRO_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(value)
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((item) => item.type === type)?.value)
  return { year: part("year"), month: part("month"), day: part("day") }
}

function addCalendarDay(value: LocalDate): LocalDate {
  const next = new Date(Date.UTC(value.year, value.month - 1, value.day + 1))
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() }
}

/** Cairo working week: Sunday through Thursday. Friday and Saturday are holidays. */
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

function hasReachedWorkingDay(start: string, reminderDay: number, now: Date): boolean {
  const due = addWorkingDays(cairoDate(new Date(start)), reminderDay)
  const today = cairoDate(now)
  return Date.UTC(today.year, today.month - 1, today.day) >= Date.UTC(due.year, due.month - 1, due.day)
}

function approvalReceivedAt(request: EngineRequest): string | null {
  const history = [...(request.statusHistory ?? [])].sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime())
  const entry = history.find((item, index) => String(item.status) === "in_progress" && (
    history.slice(0, index).some((previous) => previous.status === "awaiting_approval") || item.comment?.toLowerCase().includes("approved")
  ))
  return entry?.changedAt ?? null
}

function resolveStart(request: EngineRequest): { at: string; basis: "submission" | "approval" } | null {
  const approvedAt = approvalReceivedAt(request)
  if (approvedAt) return { at: approvedAt, basis: "approval" }
  if (requiresManagerApproval(request) || request.status === "awaiting_approval") return null
  return { at: request.createdAt, basis: "submission" }
}

function queueEmail(recordId: string, request: EngineRequest, basis: "submission" | "approval", reminderDay: number) {
  if (sending.has(recordId) || readAdminSlaReminders().find((item) => item.id === recordId)?.emailSentAt) return
  sending.add(recordId)
  void sendAdminSlaReminderEmail({ requestId: request.id, requestTitle: request.title, module: request.module, requesterName: request.requesterName, status: String(request.status), slaBasis: basis, reminderDay })
    .then(() => markAdminSlaReminder(recordId, "emailSentAt", new Date().toISOString()))
    .catch((error) => console.error(`[admin-sla-reminder] Email failed for ${request.id}:`, error))
    .finally(() => sending.delete(recordId))
}

function audit(recordId: string, request: EngineRequest, basis: "submission" | "approval", reminderDay: number) {
  const record = readAdminSlaReminders().find((item) => item.id === recordId)
  if (!record) return
  const basisLabel = basis === "approval" ? "after approval" : "after submission"
  if (!record.auditLoggedAt) {
    logServerAudit({ actor: "Administration SLA Monitor", actorEmail: "system@si-ware.com", action: "admin_sla_reminder_raised", targetId: request.id, targetTitle: "Administration SLA reminder raised", details: `${request.title} (${request.module}) reached working day ${reminderDay} ${basisLabel}; Friday and Saturday are excluded.`, category: "system", outcome: "success", functionName: "Administration" })
    markAdminSlaReminder(recordId, "auditLoggedAt", new Date().toISOString())
  }
  if (record.emailSentAt && !record.emailAuditLoggedAt) {
    logServerAudit({ actor: "Administration SLA Monitor", actorEmail: "system@si-ware.com", action: "admin_sla_email_delivered", targetId: request.id, targetTitle: "Administration SLA reminder email delivered", details: `Delivered to adminhelpdesk@si-ware.com for ${request.title}.`, category: "email", outcome: "success", functionName: "Administration" })
    markAdminSlaReminder(recordId, "emailAuditLoggedAt", new Date().toISOString())
  }
}

export function runAdminSlaReminderCheck(now = new Date()) {
  const reminderDay = Math.min(60, Math.max(1, Number.parseInt(loadSettingsServer().adminSlaReminderDay, 10) || 7))
  const recipients = readUsers().filter((user) =>
    user.active && canAccessAdministrationSlaReminders(user.role, findRoleByName(user.role)?.permissions),
  )
  let created = 0
  for (const request of requestStore.getAll()) {
    if (functionForModule(request.module) !== "admin" || TERMINAL.has(String(request.status))) continue
    const start = resolveStart(request)
    if (!start || !hasReachedWorkingDay(start.at, reminderDay, now)) continue
    const recordId = `ADM-SLA-WORKDAY${reminderDay}-${request.id}-${start.at.slice(0, 10)}`
    const added = addAdminSlaReminder({ id: recordId, requestId: request.id, requestTitle: request.title, module: request.module, requesterName: request.requesterName, slaStartedAt: start.at, slaBasis: start.basis, reminderDay, calculationMethod: "working_days", sentAt: now.toISOString() })
    audit(recordId, request, start.basis, reminderDay)
    queueEmail(recordId, request, start.basis, reminderDay)
    if (!added) continue
    const basis = start.basis === "approval" ? "after approval" : "after submission"
    const notifications: ServerNotification[] = recipients.map((user) => ({ id: `${recordId}-${user.id}`, userId: user.id, type: "admin_sla_reminder", title: `SLA reminder: ${request.id}`, description: `${request.title} has remained open for ${reminderDay} working days ${basis}. Friday and Saturday are excluded.`, requestId: request.id, actionUrl: `/requests/${request.id}`, functionIds: ["admin"], createdAt: now.toISOString(), read: false }))
    serverNotificationStore.addMany(notifications)
    created++
  }
  return created
}

export function startAdminSlaReminderScheduler() {
  if (started) return
  started = true
  const tick = () => { try { runAdminSlaReminderCheck() } catch (error) { console.error("[admin-sla-reminder] Check failed:", error) } }
  setTimeout(tick, 12_000)
  setInterval(tick, CHECK_INTERVAL_MS)
}
