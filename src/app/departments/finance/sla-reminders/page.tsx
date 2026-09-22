import Link from "next/link"
import { redirect } from "next/navigation"
import { AlarmClock, BellRing, CheckCircle2, FileClock } from "lucide-react"
import { auth } from "@/auth"
import { readFinanceSlaReminders } from "@/lib/financeSlaReminderStore"
import { roleToFunctionId } from "@/lib/functionRegistry"
import { requestStore } from "@/lib/requestStore"
import { loadSettingsServer } from "@/lib/settingsServer"
import { normalizeFinanceReminderDay, normalizeFinanceSlaDays } from "@/modules/finance/financeSla"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MODULE_LABELS: Record<string, string> = {
  finance_reimbursement: "General Reimbursement",
  finance_travel_reimbursement: "Travel Reimbursement",
  finance_invoice_payment: "Invoices Payment",
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Cairo",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function formatDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

function statusLabel(value?: string) {
  if (!value) return "Unavailable"
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export default async function FinanceSlaRemindersPage() {
  const session = await auth()
  if (!session?.user) redirect("/login?callbackUrl=/departments/finance/sla-reminders")

  const role = session.user.role
  if (role !== "Full Access" && roleToFunctionId(role) !== "finance") {
    redirect("/unauthorized?from=/departments/finance/sla-reminders")
  }

  const reminders = readFinanceSlaReminders().sort(
    (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
  )
  const settings = loadSettingsServer()
  const slaDays = normalizeFinanceSlaDays(settings.financeSlaWorkingDays)
  const reminderDay = normalizeFinanceReminderDay(settings.financeSlaReminderDay, slaDays)
  const daysRemaining = slaDays - reminderDay
  const requests = new Map(requestStore.getAll().map((request) => [request.id, request]))
  const approvalBased = reminders.filter((item) => item.slaBasis === "approval").length
  const open = reminders.filter((item) => {
    const status = requests.get(item.requestId)?.status
    return status && !["completed", "cancelled", "delivered"].includes(status)
  }).length

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            <AlarmClock className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Finance SLA Reminders</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              History of reminders sent on working day {reminderDay}, {daysRemaining} working {daysRemaining === 1 ? "day" : "days"} before the {slaDays}-working-day Finance SLA deadline.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3"><BellRing className="h-5 w-5 text-amber-600" /><span className="text-sm text-slate-500">Total reminders</span></div>
          <p className="mt-2 text-2xl font-bold">{reminders.length}</p>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3"><FileClock className="h-5 w-5 text-blue-600" /><span className="text-sm text-slate-500">Started after approval</span></div>
          <p className="mt-2 text-2xl font-bold">{approvalBased}</p>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-600" /><span className="text-sm text-slate-500">Requests still open</span></div>
          <p className="mt-2 text-2xl font-bold">{open}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {reminders.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <AlarmClock className="mx-auto h-10 w-10 text-slate-300" />
            <h2 className="mt-3 font-semibold text-slate-900 dark:text-white">No SLA reminders yet</h2>
            <p className="mt-1 text-sm text-slate-500">Reminders will appear here when a Finance request reaches working day {reminderDay}.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950/40">
                <tr>
                  <th className="px-5 py-3 font-semibold">Request</th>
                  <th className="px-5 py-3 font-semibold">Service</th>
                  <th className="px-5 py-3 font-semibold">Requester</th>
                  <th className="px-5 py-3 font-semibold">SLA starts from</th>
                  <th className="px-5 py-3 font-semibold">Deadline</th>
                  <th className="px-5 py-3 font-semibold">Reminder sent</th>
                  <th className="px-5 py-3 font-semibold">Current status</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800">
                {reminders.map((item) => {
                  const request = requests.get(item.requestId)
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-4">
                        <Link href={`/departments/finance/requests/${item.requestId}`} className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
                          {item.requestId}
                        </Link>
                        <p className="mt-1 max-w-xs truncate text-xs text-slate-500" title={item.requestTitle}>{item.requestTitle}</p>
                      </td>
                      <td className="px-5 py-4">{MODULE_LABELS[item.module] ?? item.module}</td>
                      <td className="px-5 py-4">{item.requesterName || "-"}</td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          {item.slaBasis === "approval" ? "Approval received" : "Submission"}
                        </span>
                        <p className="mt-2 text-xs text-slate-500">{formatDateTime(item.slaStartedAt)}</p>
                      </td>
                      <td className="px-5 py-4 font-medium text-amber-700 dark:text-amber-300">{formatDateKey(item.deadlineDate)}</td>
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{formatDateTime(item.sentAt)}</td>
                      <td className="px-5 py-4"><span className="capitalize">{statusLabel(request?.status)}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
