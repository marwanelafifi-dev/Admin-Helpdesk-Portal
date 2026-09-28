"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { createPortal } from "react-dom"
import { AlarmClock, ArrowRight, ChevronDown, Download, FileSpreadsheet, Loader2 } from "lucide-react"
import type { EngineRequest } from "@/services/engineService"
import { modulesVisibleToFunction, type FunctionId } from "@/lib/functionRegistry"
import { downloadRequestCsv, requestExportTable } from "@/lib/requestExport"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type RequestExportScope = {
  label: string
  modules?: string[]
  mineOnly?: boolean
}

const FINANCE_MODULES = new Set([
  "finance_reimbursement",
  "finance_travel_reimbursement",
  "finance_invoice_payment",
])

function scopeForPath(pathname: string): RequestExportScope | null {
  const exactScopes: Record<string, RequestExportScope> = {
    "/requests": { label: "My Requests", mineOnly: true },
    "/admin/all-requests": { label: "Administration Team - All Requests", modules: modulesVisibleToFunction("admin") },
    "/general": { label: "General Requests", modules: ["general"] },
    "/travel": { label: "Travel Requests", modules: ["travel"] },
    "/maintenance": { label: "Maintenance Requests", modules: ["maintenance"] },
    "/purchase": { label: "Purchase Requests", modules: ["purchase"] },
    "/event": { label: "Event Requests", modules: ["event"] },
    "/shipping": { label: "Shipping Requests", modules: ["shipping"] },
    "/shipping/sending": { label: "Shipping Requests", modules: ["shipping"] },
    "/shipping/receiving": { label: "Shipping Requests", modules: ["shipping"] },
    "/hr": { label: "HR Requests", modules: ["hr"] },
    "/hr/onboarding": { label: "HR Requests", modules: ["hr"] },
    "/hr/offboarding": { label: "HR Requests", modules: ["hr"] },
    "/departments/hr/my-requests": { label: "People Team - My Requests", modules: modulesVisibleToFunction("hr"), mineOnly: true },
    "/departments/hr/all-requests": { label: "People Team - All Requests", modules: modulesVisibleToFunction("hr") },
    "/departments/hr/general": { label: "People General Requests", modules: ["hr_general"] },
    "/departments/hr/letter": { label: "HR Letter Requests", modules: ["hr_letter", "hr_travel_letter"] },
    "/departments/finance/my-requests": { label: "Finance Team - My Requests", modules: modulesVisibleToFunction("finance"), mineOnly: true },
    "/departments/finance/all-requests": { label: "Finance Team - All Requests", modules: modulesVisibleToFunction("finance") },
    "/departments/finance/reimbursement": { label: "Finance Reimbursement Requests", modules: ["finance_reimbursement"] },
    "/departments/finance/travel-reimbursement": { label: "Finance Travel Reimbursement Requests", modules: ["finance_travel_reimbursement"] },
    "/departments/finance/invoices": { label: "Finance Invoice Payment Requests", modules: ["finance_invoice_payment"] },
  }
  return exactScopes[pathname] ?? null
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}

export function RequestExportMenu({ portal }: { portal: FunctionId | "platform-admin" }) {
  const pathname = usePathname()
  const scope = scopeForPath(pathname)
  const [exporting, setExporting] = useState<"csv" | "spreadsheet" | null>(null)
  const [message, setMessage] = useState("")
  const [target, setTarget] = useState<HTMLElement | null>(null)
  const [financeSlaReminderCount, setFinanceSlaReminderCount] = useState(0)
  const financeModuleScope = (scope?.modules ?? []).filter((module) => FINANCE_MODULES.has(module))
  const financeScopeKey = financeModuleScope.join("|")
  const shouldShowFinanceSla = portal === "finance" && financeModuleScope.length > 0

  useEffect(() => {
    if (!scope || portal === "platform-admin") return

    let anchor: HTMLDivElement | null = null
    const mount = () => {
      if (anchor) return true
      const table = document.querySelector("main table")
      const parent = table?.parentElement
      if (!table || !parent) return false
      anchor = document.createElement("div")
      anchor.className = "border-b border-slate-100 bg-white/95 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900/95 sm:px-4"
      anchor.setAttribute("data-request-export-menu", "true")
      parent.insertBefore(anchor, table)
      setTarget(anchor)
      return true
    }

    if (mount()) return () => { anchor?.remove(); setTarget(null) }
    const observer = new MutationObserver(() => { if (mount()) observer.disconnect() })
    const main = document.querySelector("main")
    if (main) observer.observe(main, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
      anchor?.remove()
      setTarget(null)
    }
  }, [pathname, portal])

  useEffect(() => {
    if (!shouldShowFinanceSla) {
      setFinanceSlaReminderCount(0)
      return
    }

    let active = true
    const refresh = () => {
      fetch("/api/finance/sla-reminders", { credentials: "include", cache: "no-store" })
        .then((response) => response.ok ? response.json() : null)
        .then((data) => {
          if (!active) return
          const reminders = Array.isArray(data?.data) ? data.data : []
          setFinanceSlaReminderCount(reminders.filter((reminder: { module?: string }) => financeModuleScope.includes(String(reminder.module))).length)
        })
        .catch(() => { if (active) setFinanceSlaReminderCount(0) })
    }
    refresh()
    const interval = window.setInterval(refresh, 60_000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [shouldShowFinanceSla, financeScopeKey])

  if (!scope || portal === "platform-admin" || !target) return null

  async function getScopedRequests(): Promise<EngineRequest[]> {
    const response = await fetch("/api/requests", { credentials: "include", cache: "no-store" })
    if (!response.ok) throw new Error("Requests could not be loaded for export.")
    const body = await response.json()
    const all = Array.isArray(body?.data) ? body.data as EngineRequest[] : []
    const moduleScoped = scope.modules?.length ? all.filter((request) => scope.modules?.includes(request.module)) : all
    if (!scope.mineOnly) return moduleScoped
    // The server has already applied visibility rules. My Requests must still
    // mirror the personal queue, so retain only records belonging to this
    // browser session when the page has loaded them into the response.
    const me = (await fetch("/api/auth/session", { cache: "no-store" }).then((r) => r.ok ? r.json() : null))?.user
    return moduleScoped.filter((request) => request.requesterId === me?.id || request.requesterEmail?.toLowerCase() === String(me?.email ?? "").toLowerCase())
  }

  async function exportCsv() {
    setExporting("csv")
    setMessage("")
    try {
      const requests = await getScopedRequests()
      downloadRequestCsv(requests, `${slug(scope.label)}-${new Date().toISOString().slice(0, 10)}.csv`)
      void recordExport("CSV", requests.length)
      setMessage(`${requests.length} request${requests.length === 1 ? "" : "s"} exported.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Export failed.")
    } finally {
      setExporting(null)
    }
  }

  async function createGoogleSheet() {
    setExporting("spreadsheet")
    setMessage("")
    try {
      const requests = await getScopedRequests()
      const table = requestExportTable(requests)
      const response = await fetch("/api/google-sheets/exports", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: scope.label, modules: scope.modules ?? [], requestCount: requests.length, values: [table.headers, ...table.rows] }),
      })
      const body = await response.json().catch(() => null)
      if (!response.ok || !body?.authorizationUrl) throw new Error(body?.error || "Could not start the Google Sheets export.")
      window.location.assign(body.authorizationUrl)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create the Google Sheet.")
    } finally {
      setExporting(null)
    }
  }

  async function recordExport(format: string, requestCount: number) {
    try {
      await fetch("/api/audit/exports", {
        method: "POST",
        credentials: "include",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, scope: scope.label, requestCount, modules: scope.modules ?? [] }),
      })
    } catch {
      // The downloaded file remains valid even if the best-effort audit call
      // is interrupted by navigation or a transient network error.
    }
  }

  return createPortal(
    <div className="flex w-full flex-col gap-2">
      {shouldShowFinanceSla && financeSlaReminderCount > 0 && (
        <Link
          href="/departments/finance/sla-reminders"
          className="group flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100/70 px-4 py-3 shadow-sm transition hover:border-amber-400 hover:shadow-md dark:border-amber-500/40 dark:from-amber-950/50 dark:via-orange-950/35 dark:to-slate-900"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white shadow-sm"><AlarmClock className="h-4.5 w-4.5" /></span>
            <div className="min-w-0">
              <p className="font-semibold text-amber-950 dark:text-amber-100">{financeSlaReminderCount} SLA reminder{financeSlaReminderCount === 1 ? "" : "s"} need attention in this request list</p>
              <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-200">Review the affected requests and their SLA deadlines before they are missed.</p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-amber-900 group-hover:underline dark:text-amber-100">View SLA Reminders <ArrowRight className="h-3.5 w-3.5" /></span>
        </Link>
      )}
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="inline-flex gap-1.5 border-blue-200 bg-white/90 font-semibold text-[#173f91] shadow-sm hover:border-blue-300 hover:bg-blue-50 dark:border-sky-400/30 dark:bg-slate-900/80 dark:text-sky-100 dark:hover:bg-sky-400/10" title={`Export ${scope.label}`}>
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              <span>Export Requests</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>Export {scope.label}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={Boolean(exporting)} onSelect={(event) => { event.preventDefault(); void exportCsv() }} className="cursor-pointer gap-3 py-3">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <div><p className="font-medium">Download CSV</p><p className="text-xs text-muted-foreground">All fields, compatible with Excel and Sheets</p></div>
            </DropdownMenuItem>
            <DropdownMenuItem disabled={Boolean(exporting)} onSelect={(event) => { event.preventDefault(); void createGoogleSheet() }} className="cursor-pointer gap-3 py-3">
              <span className="grid h-4 w-4 place-items-center rounded-sm bg-emerald-600 text-[9px] font-bold text-white">S</span>
              <div><p className="font-medium">Create Google Sheet</p><p className="text-xs text-muted-foreground">Creates and opens a populated Sheet in your Google Drive</p></div>
            </DropdownMenuItem>
            {message ? <><DropdownMenuSeparator /><p className="px-3 py-2 text-xs text-muted-foreground">{message}</p></> : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
    ,
    target,
  )
}
