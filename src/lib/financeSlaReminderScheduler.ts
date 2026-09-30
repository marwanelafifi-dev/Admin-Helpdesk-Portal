import { roleToFunctionId } from "@/lib/functionRegistry"
import { addFinanceSlaReminder, markFinanceSlaReminderAuditLogged, markFinanceSlaReminderEmailSent, readFinanceSlaReminders } from "@/lib/financeSlaReminderStore"
import { commentsStore } from "@/lib/commentsStore"
import { sendFinanceSlaReminderEmail } from "@/lib/emailService"
import { requestStore } from "@/lib/requestStore"
import { serverNotificationStore, type ServerNotification } from "@/lib/serverNotificationStore"
import { loadSettingsServer } from "@/lib/settingsServer"
import { readUsers } from "@/lib/userStore"
import { logServerAudit } from "@/lib/serverAuditLog"
import { normalizeFinanceReminderDay, normalizeFinanceSlaDays } from "@/modules/finance/financeSla"
import type { EngineRequest } from "@/services/engineService"

const CHECK_INTERVAL_MS = 60 * 60 * 1000
const FINANCE_MODULES = new Set(["finance_reimbursement", "finance_travel_reimbursement", "finance_invoice_payment"])
const TERMINAL_STATUSES = new Set(["completed", "cancelled", "delivered", "rejected"])
const CAIRO_TIME_ZONE = "Africa/Cairo"

type LocalDate = { year: number; month: number; day: number }
type SlaStart = { at: string; basis: "submission" | "approval" }

let started = false
const sendingReminderEmails = new Set<string>()

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

function queueFinanceSlaReminderEmail(params: {
  reminderId: string
  request: EngineRequest
  slaStart: SlaStart
  reminderDay: number
  slaDays: number
  deadlineDate: LocalDate
}) {
  if (sendingReminderEmails.has(params.reminderId)) return
  const stored = readFinanceSlaReminders().find((item) => item.id === params.reminderId)
  if (stored?.emailSentAt) return

  sendingReminderEmails.add(params.reminderId)
  void sendFinanceSlaReminderEmail({
    requestId: params.request.id,
    requestTitle: params.request.title,
    module: params.request.module,
    requesterName: params.request.requesterName,
    requesterEmail: params.request.requesterEmail,
    status: String(params.request.status),
    slaBasis: params.slaStart.basis,
    reminderWorkingDay: params.reminderDay,
    slaWorkingDays: params.slaDays,
    deadline: formatDeadline(params.deadlineDate),
  })
    .then(() => {
      markFinanceSlaReminderEmailSent(params.reminderId, new Date().toISOString())
      console.log(`[finance-sla-reminder] Email sent to ap@si-ware.com for ${params.request.id}`)
    })
    .catch((error) => {
      // Leave emailSentAt unset so the next hourly check can retry a failed
      // delivery. The in-memory set only prevents concurrent sends this run.
      console.error(`[finance-sla-reminder] Email failed for ${params.request.id}:`, error)
    })
    .finally(() => sendingReminderEmails.delete(params.reminderId))
}

function recordFinanceSlaAudit(params: {
  reminderId: string
  request: EngineRequest
  slaStart: SlaStart
  reminderDay: number
  slaDays: number
  deadlineDate: LocalDate
}) {
  const stored = readFinanceSlaReminders().find((item) => item.id === params.reminderId)
  if (!stored) return
  const deadline = formatDeadline(params.deadlineDate)
  const basis = params.slaStart.basis === "approval" ? "after approval" : "after submission"

  if (!stored.auditLoggedAt) {
    logServerAudit({
      actor: "Finance SLA Monitor", actorEmail: "system@si-ware.com",
      action: "finance_sla_reminder_raised", targetId: params.request.id,
      targetTitle: "Finance SLA reminder raised",
      details: `${params.request.title} (${params.request.module}) reached working day ${params.reminderDay} ${basis}; SLA deadline ${deadline}.`,
      category: "system", outcome: "success", functionName: "Finance",
    })
    markFinanceSlaReminderAuditLogged(params.reminderId, "reminder", new Date().toISOString())
  }

  // Existing reminders created before email auditing was introduced are
  // backfilled once, so the Audit Trail tells the complete current story.
  if (stored.emailSentAt && !stored.emailAuditLoggedAt) {
    logServerAudit({
      actor: "Finance SLA Monitor", actorEmail: "system@si-ware.com",
      action: "finance_sla_email_delivered", targetId: params.request.id,
      targetTitle: "Finance SLA reminder email delivered",
      details: `Delivered to ap@si-ware.com for ${params.request.title}; SLA deadline ${deadline}.`,
      category: "email", outcome: "success", functionName: "Finance",
    })
    markFinanceSlaReminderAuditLogged(params.reminderId, "email", new Date().toISOString())
  }
}

export function runFinanceSlaReminderCheck(now = new Date()): number {
  const todayKey = dateKey(cairoDate(now))
  const settings = loadSettingsServer()
  // Record the SLA event even while a Finance Team roster is being set up.
  // Full Access users are the operational fallback, so they can see and act
  // on Finance deadlines instead of the scheduler silently doing nothing.
  const financeUsers = readUsers().filter((user) => user.active && (
    roleToFunctionId(user.role) === "finance" || user.role === "Full Access"
  ))

  let created = 0
  for (const request of requestStore.getAll()) {
    if (!FINANCE_MODULES.has(request.module) || TERMINAL_STATUSES.has(String(request.status))) continue
    const isPrePaidInvoice = request.module === "finance_invoice_payment"
    const slaDays = normalizeFinanceSlaDays(isPrePaidInvoice ? settings.prePaidInvoiceSlaWorkingDays : settings.financeSlaWorkingDays)
    const reminderDay = normalizeFinanceReminderDay(isPrePaidInvoice ? settings.prePaidInvoiceSlaReminderDay : settings.financeSlaReminderDay, slaDays)
    const daysRemaining = slaDays - reminderDay
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

    recordFinanceSlaAudit({ reminderId: recordId, request, slaStart, reminderDay, slaDays, deadlineDate })

    // The comment lives with the request as a durable, visible alert. It is
    // independently idempotent, so reminders that already existed before this
    // feature was introduced also gain their request-thread alert on the next run.
    const commentId = `CMT-${recordId}`
    if (!commentsStore.getComments(request.id).some((comment) => comment.id === commentId)) {
      commentsStore.addComment(request.id, {
        id: commentId,
        content: `Finance SLA reminder: this request has reached working day ${reminderDay} ${slaStart.basis === "approval" ? "after approval" : "after submission"}. Please review it before the SLA deadline on ${formatDeadline(deadlineDate)}.`,
        authorId: "system-finance-sla",
        author: { id: "system-finance-sla", name: "Finance SLA Monitor", email: "system@si-ware.com" },
        createdAt: sentAt,
      })
    }

    queueFinanceSlaReminderEmail({
      reminderId: recordId,
      request,
      slaStart,
      reminderDay,
      slaDays,
      deadlineDate,
    })

    // A record has already notified the Finance team; never duplicate the
    // notification just because the scheduler runs again.
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
