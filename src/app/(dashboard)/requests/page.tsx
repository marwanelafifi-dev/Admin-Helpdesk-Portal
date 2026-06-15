"use client"

import { useEffect, useMemo, useRef, useCallback, useState } from "react"
import Link from "next/link"
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, MessageCircle, Star, X, ArrowRight } from "lucide-react"
import { useSession } from "next-auth/react"
import { Input } from "@/components/ui/input"
import { Card, CardHeader } from "@/components/ui/card"
import { InlineStatusSelect } from "@/components/ui/InlineStatusSelect"
import { getRequests, initializeMockData, type EngineRequest } from "@/services/engineService"
import { cn, fmtDate, fmtDateTime } from "@/lib/utils"
import { animationClasses } from "@/lib/animations"
import { requestsAPI } from "@/lib/apiClient"
import { useCommentCounts } from "@/hooks/useCommentCounts"
import { useViewedComments } from "@/hooks/useViewedComments"
import { useNewRequestsAndTasks } from "@/hooks/useNewRequestsAndTasks"
import { NewItemsAlert } from "@/components/ui/NewItemsAlert"
import { LABEL_COLORS, LABEL_DOTS, buildLabelDrivenMaps } from "@/lib/statusPalette"

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  in_progress: "In Progress",
  on_hold: "In Progress", // legacy alias
  in_customs: "In Customs",
  awaiting_approval: "Awaiting Approval",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
}

// Color resolution comes from the shared label-driven palette in
// lib/statusPalette so all list pages stay consistent.

const STATUS_COLORS: Record<string, string> = {
  new:               LABEL_COLORS["New"],
  in_progress:       LABEL_COLORS["In Progress"],
  on_hold:           LABEL_COLORS["In Progress"],
  in_customs:        LABEL_COLORS["In Customs"],
  awaiting_approval: LABEL_COLORS["Awaiting Approval"],
  delivered:         LABEL_COLORS["Delivered"],
  completed:         LABEL_COLORS["Completed"],
  cancelled:         LABEL_COLORS["Cancelled"],
}

const STATUS_DOT: Record<string, string> = {
  new:               LABEL_DOTS["New"],
  in_progress:       LABEL_DOTS["In Progress"],
  on_hold:           LABEL_DOTS["In Progress"],
  in_customs:        LABEL_DOTS["In Customs"],
  awaiting_approval: LABEL_DOTS["Awaiting Approval"],
  delivered:         LABEL_DOTS["Delivered"],
  completed:         LABEL_DOTS["Completed"],
  cancelled:         LABEL_DOTS["Cancelled"],
}

const STATUS_PILL_ACTIVE: Record<string, string> = {
  new:               "bg-sky-500 border-sky-500 text-white",
  in_progress:       "bg-blue-600 border-blue-600 text-white",
  in_customs:        "bg-amber-600 border-amber-600 text-white",
  awaiting_approval: "bg-amber-600 border-amber-600 text-white",
  delivered:         "bg-green-600 border-green-600 text-white",
  completed:         "bg-emerald-600 border-emerald-600 text-white",
  cancelled:         "bg-red-600 border-red-600 text-white",
}

const MODULE_COLORS: Record<string, string> = {
  shipping: "text-blue-700", maintenance: "text-purple-700",
  purchase: "text-green-700", event: "text-orange-600",
  travel: "text-pink-600", hr: "text-teal-700", general: "text-indigo-700",
}

const MODULE_DOT: Record<string, string> = {
  shipping: "bg-blue-500", maintenance: "bg-purple-500",
  purchase: "bg-green-500", event: "bg-orange-500",
  travel: "bg-pink-500", hr: "bg-teal-500", general: "bg-indigo-500",
}

const MODULE_PILL_ACTIVE: Record<string, string> = {
  shipping: "bg-blue-600 border-blue-600 text-white",
  maintenance: "bg-purple-600 border-purple-600 text-white",
  purchase: "bg-green-600 border-green-600 text-white",
  event: "bg-orange-500 border-orange-500 text-white",
  travel: "bg-pink-500 border-pink-500 text-white",
  hr: "bg-teal-600 border-teal-600 text-white",
  general: "bg-indigo-600 border-indigo-600 text-white",
}

const STATUSES = ["new", "in_progress", "in_customs", "awaiting_approval", "delivered", "completed", "cancelled"] as const
const MODULES  = ["shipping", "maintenance", "purchase", "event", "travel", "hr", "general"] as const

// Module-specific allowed statuses — drives the inline status dropdown so each
// row only offers statuses that make sense for its module.
const MODULE_STATUSES: Record<string, readonly string[]> = {
  shipping:    ["new", "in_progress", "in_customs", "delivered", "cancelled"],
  maintenance: ["new", "in_progress", "completed", "cancelled"],
  purchase:    ["new", "in_progress", "awaiting_approval", "delivered", "cancelled"],
  event:       ["new", "in_progress", "delivered", "completed", "cancelled"],
  travel:      ["new", "in_progress", "delivered", "completed", "cancelled"],
  hr:          ["new", "in_progress", "completed"],
  general:     ["new", "in_progress", "completed", "cancelled"],
}

// Module-specific status labels — codes match the UI text 1:1.
const MODULE_STATUS_LABELS: Record<string, Record<string, string>> = {
  shipping:    { new: "New", in_progress: "In Progress", in_customs: "In Customs", delivered: "Delivered", cancelled: "Cancelled" },
  purchase:    { new: "New", in_progress: "In Progress", awaiting_approval: "Awaiting Approval", delivered: "Delivered", cancelled: "Cancelled" },
  maintenance: { new: "New", in_progress: "In Progress", completed: "Completed", cancelled: "Cancelled" },
  event:       { new: "New", in_progress: "In Progress", delivered: "Delivered", completed: "Completed", cancelled: "Cancelled" },
  travel:      { new: "New", in_progress: "In Progress", delivered: "Delivered", completed: "Completed", cancelled: "Cancelled" },
  hr:          { new: "New", in_progress: "In Progress", completed: "Completed" },
  general:     { new: "New", in_progress: "In Progress", completed: "Completed", cancelled: "Cancelled" },
}

const STAT_CARDS = [
  { key: "total",       label: "Total",             accentBg: "bg-slate-800",   accentBorder: "border-slate-800" },
  { key: "new",         label: "New",               accentBg: "bg-sky-500",     accentBorder: "border-sky-500" },
  { key: "in_progress", label: "In Progress",       accentBg: "bg-blue-600",    accentBorder: "border-blue-600" },
  { key: "in_customs",  label: "In Customs",        accentBg: "bg-amber-600",   accentBorder: "border-amber-600" },
  { key: "delivered",   label: "Delivered",         accentBg: "bg-green-600",   accentBorder: "border-green-600" },
  { key: "completed",   label: "Completed",         accentBg: "bg-emerald-600", accentBorder: "border-emerald-600" },
  { key: "cancelled",   label: "Cancelled",         accentBg: "bg-red-600",     accentBorder: "border-red-600" },
] as const

type SortKey = "id" | "title" | "module" | "status" | "createdAt" | "updatedAt"

const COLS: { key: SortKey; label: string; defaultW: number }[] = [
  { key: "id",        label: "Request ID",        defaultW: 150 },
  { key: "title",     label: "Request Title",     defaultW: 340 },
  { key: "createdAt", label: "Submitted",         defaultW: 120 },
  { key: "module",    label: "Module",            defaultW: 130 },
  { key: "status",    label: "Status",            defaultW: 130 },
  { key: "updatedAt", label: "Last Update Date",  defaultW: 120 },
]

function formatModule(m: string) { return m.charAt(0).toUpperCase() + m.slice(1) }

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RequestsPage() {
  const { data: session } = useSession()
  // Match the request to the logged-in user by id, email (case-insensitive),
  // or session name — whichever the request was saved with. Older requests
  // may have been written before Google auth (USR-* style ids); newer ones
  // have the real session user id or just the email.
  const currentUserId    = session?.user?.id ?? ""
  const currentUserEmail = (session?.user?.email ?? "").toLowerCase()
  const currentUserName  = session?.user?.name ?? ""
  const canUpdateStatus = ((session?.user?.permissions as string[])?.includes("update_status") || (session?.user?.permissions as string[])?.includes("*")) ?? false

  const [requests, setRequests]         = useState<EngineRequest[]>([])
  const [search, setSearch]             = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [moduleFilter, setModuleFilter] = useState("all")
  const [sortKey, setSortKey]           = useState<SortKey>("updatedAt")
  const [sortDir, setSortDir]           = useState<"asc" | "desc">("desc")
  const [colWidths, setColWidths]       = useState<(number | null)[]>(() => COLS.map(() => null))
  // Request IDs (across the entire server-side feedback_responses store) that
  // already have a submitted survey — so we know which of MY completed/delivered
  // requests still need feedback. Server-side data: works across devices.
  const [feedbackDoneIds, setFeedbackDoneIds] = useState<Set<string>>(new Set())
  const [reminderDismissed, setReminderDismissed] = useState(false)
  const tableRef = useRef<HTMLTableElement>(null)

  const commentCounts = useCommentCounts(requests.map(r => r.id))
  const { viewedComments } = useViewedComments()
  const { newRequestsCount, newTasksCount } = useNewRequestsAndTasks()

  useEffect(() => {
    const loadRequests = () => setRequests(getRequests())
    loadRequests()
    window.addEventListener("storage", loadRequests)
    window.addEventListener("arp:storage", loadRequests)
    return () => {
      window.removeEventListener("storage", loadRequests)
      window.removeEventListener("arp:storage", loadRequests)
    }
  }, [])

  // Load the set of request IDs that already have a submitted feedback response,
  // so we can detect which of the user's completed requests still need rating.
  useEffect(() => {
    let cancelled = false
    fetch("/api/feedback/responses")
      .then((res) => res.ok ? res.json() : { responses: [] })
      .then((data) => {
        if (cancelled) return
        const ids = new Set<string>(
          (Array.isArray(data.responses) ? data.responses : [])
            .map((r: any) => r.requestId)
            .filter(Boolean)
        )
        setFeedbackDoneIds(ids)
      })
      .catch(() => { /* feedback reminder is best-effort */ })
    return () => { cancelled = true }
  }, [])

  const onResizeMouseDown = useCallback((e: React.MouseEvent, idx: number) => {
    e.preventDefault(); e.stopPropagation()
    const startX = e.clientX
    const th = (e.currentTarget as HTMLElement).closest("th")
    const startW = th ? th.getBoundingClientRect().width : (colWidths[idx] ?? 120)
    const onMove = (ev: MouseEvent) => {
      const newW = Math.max(60, startW + ev.clientX - startX)
      setColWidths((prev) => prev.map((w, i) => i === idx ? newW : w))
    }
    const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp) }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
  }, [colWidths])

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("asc") }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronsUpDown className="h-3 w-3 ml-1 opacity-40 shrink-0" />
    return sortDir === "asc" ? <ChevronUp className="h-3 w-3 ml-1 shrink-0" /> : <ChevronDown className="h-3 w-3 ml-1 shrink-0" />
  }

  const userRequests = useMemo(() => requests.filter((r) => {
    if (currentUserId && r.requesterId === currentUserId) return true
    if (currentUserEmail && (r.requesterEmail ?? "").toLowerCase() === currentUserEmail) return true
    if (currentUserName && r.requesterName === currentUserName) return true
    return false
  }), [requests, currentUserId, currentUserEmail, currentUserName])

  // User's completed/delivered requests that still don't have a submitted
  // feedback response — these drive the "Please rate" reminder banner.
  const pendingFeedback = useMemo(() => {
    const isClosed = (s: string) => s === "completed" || s === "delivered"
    return userRequests
      .filter((r) => isClosed(r.status) && !feedbackDoneIds.has(r.id))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }, [userRequests, feedbackDoneIds])

  function updateRequestStatus(id: string, status: string) {
    setRequests((prev) => prev.map((request) =>
      request.id === id ? { ...request, status, updatedAt: new Date().toISOString() } : request
    ))
  }

  const filtered = useMemo(() => {
    let result = userRequests
    if (statusFilter !== "all") result = result.filter((r) => r.status === statusFilter)
    if (moduleFilter !== "all") result = result.filter((r) => r.module === moduleFilter)
    const q = search.trim().toLowerCase()
    if (q) result = result.filter((r) =>
      r.id.toLowerCase().includes(q) || r.title.toLowerCase().includes(q) || r.requesterName.toLowerCase().includes(q)
    )
    return result.sort((a, b) => {
      const av = String(a[sortKey as keyof EngineRequest] ?? "")
      const bv = String(b[sortKey as keyof EngineRequest] ?? "")
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av)
    })
  }, [userRequests, statusFilter, moduleFilter, search, sortKey, sortDir])

  const counts = useMemo(() => ({
    total:       userRequests.length,
    new:         userRequests.filter((r) => r.status === "new").length,
    in_progress: userRequests.filter((r) => r.status === "in_progress" || r.status === "on_hold").length,
    in_customs:  userRequests.filter((r) => r.status === "in_customs").length,
    delivered:   userRequests.filter((r) => r.status === "delivered").length,
    completed:   userRequests.filter((r) => r.status === "completed").length,
    cancelled:   userRequests.filter((r) => r.status === "cancelled").length,
  }), [userRequests])

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className={cn("flex items-center justify-between", animationClasses.headerFadeIn)}>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">My Requests</h1>
          <p className="text-muted-foreground text-sm mt-0.5">View all your requests across all modules</p>
        </div>
        {(newRequestsCount > 0 || newTasksCount > 0) && (
          <NewItemsAlert requestsCount={newRequestsCount} tasksCount={newTasksCount} variant="icon" className="ml-4" />
        )}
      </div>

      {/* Pending Feedback Reminder — shows when the user has completed requests
          that haven't been rated yet. Dismissible per session (refresh re-shows). */}
      {!reminderDismissed && pendingFeedback.length > 0 && (
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Star className="h-4.5 w-4.5 text-amber-700 fill-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-amber-900">
                  {pendingFeedback.length === 1
                    ? "1 completed request is waiting for your feedback"
                    : `${pendingFeedback.length} completed requests are waiting for your feedback`}
                </p>
                <button
                  type="button"
                  onClick={() => setReminderDismissed(true)}
                  className="p-1 rounded hover:bg-amber-100 text-amber-700"
                  aria-label="Dismiss reminder"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-xs text-amber-700 mt-0.5">
                Help us improve — your rating takes seconds and shapes how the team handles future requests.
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {pendingFeedback.slice(0, 5).map((r) => (
                  <Link
                    key={r.id}
                    href={`/requests/${r.id}?source=my-requests#feedback`}
                    className="inline-flex items-center gap-1.5 rounded-md bg-white border border-amber-300 px-2.5 py-1 text-xs font-medium text-amber-900 hover:border-amber-400 hover:bg-amber-100 transition-colors"
                  >
                    <span className="font-semibold">{r.id}</span>
                    <span className="text-amber-700 truncate max-w-[180px]">— {r.title}</span>
                    <ArrowRight className="h-3 w-3 opacity-70" />
                  </Link>
                ))}
                {pendingFeedback.length > 5 && (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-amber-700">
                    +{pendingFeedback.length - 5} more
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-4 lg:grid-cols-8 gap-3">
        {STAT_CARDS.map(({ key, label, accentBg, accentBorder }, index) => {
          const count = counts[key as keyof typeof counts]
          const isActive = key === "total"
            ? statusFilter === "all" && moduleFilter === "all"
            : statusFilter === key
          return (
            <button
              key={key}
              onClick={() => {
                if (key === "total") { setStatusFilter("all"); setModuleFilter("all") }
                else setStatusFilter((p) => p === key ? "all" : key)
              }}
              className={cn(
                "text-left rounded-xl border-2 px-4 py-3 transition-all hover:shadow-md",
                isActive
                  ? `${accentBg} ${accentBorder} text-white shadow-sm`
                  : "bg-white border-gray-100 hover:border-gray-200",
                
              )}
            >
              <p className={cn("text-[10px] font-semibold uppercase tracking-widest mb-1", isActive ? "text-white/70" : "text-gray-400")}>{label}</p>
              <p className={cn("text-2xl font-bold", isActive ? "text-white" : "text-gray-900")}>{count}</p>
            </button>
          )
        })}
      </div>

      {/* Table Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search ID, title, requester…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Status pills */}
          <div className="flex items-center gap-3 flex-wrap mt-1">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest w-12 shrink-0">Status</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setStatusFilter("all")}
                className={cn("h-6 px-2.5 rounded text-[11px] font-medium border transition-all",
                  statusFilter === "all" ? "bg-gray-900 border-gray-900 text-white" : "bg-white border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700"
                )}
              >All</button>
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn("h-6 px-2.5 rounded text-[11px] font-medium border transition-all",
                    statusFilter === s ? STATUS_PILL_ACTIVE[s] : "bg-white border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700"
                  )}
                >{STATUS_LABELS[s]}</button>
              ))}
            </div>
          </div>

          {/* Module pills */}
          <div className="flex items-center gap-3 flex-wrap mt-0.5">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest w-12 shrink-0">Module</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setModuleFilter("all")}
                className={cn("h-6 px-2.5 rounded text-[11px] font-medium border transition-all",
                  moduleFilter === "all" ? "bg-gray-900 border-gray-900 text-white" : "bg-white border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700"
                )}
              >All</button>
              {MODULES.map((m) => (
                <button
                  key={m}
                  onClick={() => setModuleFilter(m)}
                  className={cn("h-6 px-2.5 rounded text-[11px] font-medium border transition-all",
                    moduleFilter === m ? MODULE_PILL_ACTIVE[m] : "bg-white border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700"
                  )}
                >{formatModule(m)}</button>
              ))}
            </div>
          </div>

          <p className="text-sm text-muted-foreground font-normal mt-1">
            Showing {filtered.length} of {counts.total} requests
          </p>
        </CardHeader>

        {/* Table */}
        <div className="-mx-6 px-6 -mb-6 overflow-visible">
          <div className="overflow-x-auto overflow-y-visible">
            <table ref={tableRef} className="w-full text-sm border-collapse" style={{ tableLayout: colWidths.some(w => w !== null) ? "fixed" : "auto" }}>
            <colgroup>
              {colWidths.map((w, i) => <col key={i} style={w !== null ? { width: w } : undefined} />)}
              <col />
            </colgroup>
            <thead className="bg-slate-800">
              <tr className="border-b border-slate-700">
                {COLS.map((col, idx) => (
                  <th
                    key={col.key}
                    className="relative py-3 text-xs font-semibold text-slate-300 tracking-wide text-left select-none group"
                    style={{ paddingLeft: idx === 0 ? 20 : 12, paddingRight: 8 }}
                  >
                    <button onClick={() => handleSort(col.key)} className="inline-flex items-center gap-0.5 hover:text-white transition-colors w-full">
                      {col.label}
                      <SortIcon col={col.key} />
                    </button>
                    <span
                      onMouseDown={(e) => onResizeMouseDown(e, idx)}
                      className="absolute right-0 top-0 h-full w-4 flex items-center justify-center cursor-col-resize z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <span className="w-px h-4 bg-slate-500 rounded" />
                    </span>
                  </th>
                ))}
                <th className="bg-slate-800" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((req, i) => {
                const hasUnreadComments = (commentCounts[req.id] ?? 0) > (viewedComments[req.id] ?? 0)
                return (
                <tr key={req.id} className={cn(
                  "border-b border-gray-100 hover:bg-blue-50/30 transition-colors",
                  hasUnreadComments ? "bg-blue-50" : (i % 2 === 0 ? "bg-white" : "bg-gray-50/40"),
                  
                )}>
                  <td className="py-3 overflow-hidden" style={{ paddingLeft: 20, paddingRight: 8 }}>
                    <div className="flex items-center gap-2">
                      <Link href={`/requests/${req.id}?source=my-requests`} className="text-sm font-medium text-blue-600 truncate hover:underline">
                        {req.id}
                      </Link>
                      {(commentCounts[req.id] ?? 0) > 0 && (
                        <span className={cn(
                          "inline-flex items-center gap-1 flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-semibold",
                          hasUnreadComments
                            ? "bg-red-100 text-red-700"
                            : "bg-blue-100 text-blue-700"
                        )}>
                          {commentCounts[req.id]}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 overflow-hidden">
                    <span className="text-sm font-medium text-gray-700 truncate block">{req.title}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-sm font-medium text-gray-700 whitespace-nowrap">{fmtDate(req.createdAt)}</span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", MODULE_COLORS[req.module] ?? "text-gray-600")}>
                        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", MODULE_DOT[req.module] ?? "bg-gray-400")} />
                        {formatModule(req.module)}
                      </span>
                      {req.module === "shipping" && (() => {
                        const direction = (req.payload as any)?.direction
                        const isSending = direction === "sending"
                        return (
                          <span className={cn(
                            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide",
                            isSending
                              ? "bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/30 dark:border-purple-900 dark:text-purple-300"
                              : "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-900 dark:text-blue-300"
                          )}>
                            {isSending ? "Sending" : "Receiving"}
                          </span>
                        )
                      })()}
                      {req.module === "hr" && (() => {
                        const hrType = (req.payload as any)?.hrType
                        const isOffboarding = hrType === "offboarding"
                        return (
                          <span className={cn(
                            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide",
                            isOffboarding
                              ? "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/30 dark:border-red-900 dark:text-red-300"
                              : "bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950/30 dark:border-teal-900 dark:text-teal-300"
                          )}>
                            {isOffboarding ? "Offboarding" : "Onboarding"}
                          </span>
                        )
                      })()}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    {(() => {
                      const statuses = MODULE_STATUSES[req.module] ?? STATUSES
                      const moduleLabels = { ...STATUS_LABELS, ...(MODULE_STATUS_LABELS[req.module] ?? {}) }
                      const { statusColors, statusDot } = buildLabelDrivenMaps(statuses, moduleLabels)
                      return (
                        <InlineStatusSelect
                          currentStatus={req.status}
                          statuses={statuses}
                          statusColors={statusColors}
                          statusDot={statusDot}
                          statusLabels={moduleLabels}
                          onStatusChange={(nextStatus) => updateRequestStatus(req.id, nextStatus)}
                          canUpdateStatus={canUpdateStatus}
                        />
                      )
                    })()}
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-sm font-medium text-gray-700 whitespace-nowrap">{fmtDateTime(req.updatedAt)}</span>
                  </td>
                </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-gray-400 text-sm">
                    No records match the current filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>

            {filtered.length > 0 && (
              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 text-[11px] text-gray-400 text-right">
                Showing {filtered.length} of {counts.total} requests
              </div>
            )}
            </div>
          </div>
      </Card>
    </div>
  )
}
