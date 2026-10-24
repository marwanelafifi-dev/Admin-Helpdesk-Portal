import Link from "next/link"
import { redirect } from "next/navigation"
import { AlarmClock, BellRing, CheckCircle2 } from "lucide-react"
import { auth } from "@/auth"
import { readAdminSlaReminders } from "@/lib/adminSlaReminderStore"
import { roleToFunctionId, requestModuleLabel } from "@/lib/functionRegistry"
import { requestStore } from "@/lib/requestStore"
import { loadSettingsServer } from "@/lib/settingsServer"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
const TERMINAL = new Set(["completed", "cancelled", "delivered", "rejected"])
const when = (value: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Cairo", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value))

export default async function AdminSlaRemindersPage() {
  const session = await auth()
  if (!session?.user) redirect("/login?callbackUrl=/admin/sla-reminders")
  if (session.user.role !== "Full Access" && roleToFunctionId(session.user.role) !== "admin") redirect("/unauthorized?from=/admin/sla-reminders")
  const reminders = readAdminSlaReminders().sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
  const requests = new Map(requestStore.getAll().map((request) => [request.id, request]))
  const open = reminders.filter((item) => !TERMINAL.has(String(requests.get(item.requestId)?.status ?? ""))).length
  const day = loadSettingsServer().adminSlaReminderDay
  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><AlarmClock className="h-6 w-6" /></span><div><h1 className="text-2xl font-bold tracking-tight">Administration SLA Reminders</h1><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Internal reminders are raised when an Administration request remains open for {day} calendar days after submission or, where approval is required, after approval. Requesters do not see SLA notes.</p></div></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2"><div className="rounded-xl border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex gap-3 text-sm text-slate-500"><BellRing className="h-5 w-5 text-amber-600" />Total reminders</div><p className="mt-2 text-2xl font-bold">{reminders.length}</p></div><div className="rounded-xl border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex gap-3 text-sm text-slate-500"><CheckCircle2 className="h-5 w-5 text-emerald-600" />Requests still open</div><p className="mt-2 text-2xl font-bold">{open}</p></div></div>
      <div className="overflow-hidden rounded-xl border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {reminders.length === 0 ? <div className="px-6 py-16 text-center"><AlarmClock className="mx-auto h-10 w-10 text-slate-300" /><h2 className="mt-3 font-semibold">No SLA reminders yet</h2></div> : <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left text-sm"><thead className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Request</th><th className="px-5 py-3">Service</th><th className="px-5 py-3">Requester</th><th className="px-5 py-3">SLA starts from</th><th className="px-5 py-3">Reminder sent</th><th className="px-5 py-3">Current status</th></tr></thead><tbody className="divide-y">{reminders.map((item) => { const request = requests.get(item.requestId); const isOpen = request ? !TERMINAL.has(String(request.status)) : false; return <tr key={item.id} className={isOpen ? "bg-amber-50/80 transition-colors hover:bg-amber-100/80 dark:bg-amber-950/20 dark:hover:bg-amber-950/35" : "transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"}><td className="px-5 py-4"><Link href={`/requests/${item.requestId}?source=admin-sla-reminders`} className="font-semibold text-blue-600 hover:underline">{item.requestId}</Link><p className="mt-1 max-w-xs truncate text-xs text-slate-500">{item.requestTitle}</p></td><td className="px-5 py-4">{requestModuleLabel(item.module)}</td><td className="px-5 py-4">{item.requesterName}</td><td className="px-5 py-4">{item.slaBasis === "approval" ? "Approval received" : "Submission"}<p className="mt-1 text-xs text-slate-500">{when(item.slaStartedAt)}</p></td><td className="px-5 py-4">{when(item.sentAt)}</td><td className="px-5 py-4"><div className="flex flex-wrap items-center gap-2"><span className="capitalize">{String(request?.status ?? "unavailable").replaceAll("_", " ")}</span>{isOpen && <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />SLA attention</span>}</div></td></tr> })}</tbody></table></div>}
      </div>
    </div>
  )
}
