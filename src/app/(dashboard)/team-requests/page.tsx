"use client"

import { useEffect, useMemo, useRef, useCallback, useState } from "react"
import Link from "next/link"
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, MessageCircle } from "lucide-react"
import { useSession } from "next-auth/react"
import { Input } from "@/components/ui/input"
import { Card, CardHeader } from "@/components/ui/card"
import { InlineStatusSelect } from "@/components/ui/InlineStatusSelect"
import { getRequests, initializeMockData, type EngineRequest } from "@/services/engineService"
import { getManagerEmail } from "@/lib/companyDataStore"
import { cn, fmtDate, fmtDateTime } from "@/lib/utils"
import { animationClasses } from "@/lib/animations"
import { useCommentCounts } from "@/hooks/useCommentCounts"
import { useViewedComments } from "@/hooks/useViewedComments"
import { useNewRequestsAndTasks } from "@/hooks/useNewRequestsAndTasks"
import { NewItemsAlert } from "@/components/ui/NewItemsAlert"
import { buildLabelDrivenMaps } from "@/lib/statusPalette"

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  in_progress: "In Progress",
  on_hold: "In Progress",
  in_customs: "In Customs",
  awaiting_approval: "Awaiting Approval",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
}

const STATUS_PILL_ACTIVE: Record<string, string> = {
  new:               "bg-sky-500 border-sky-500 text-white",
  in_progress:       "bg-blue-600 border-blue-600 text-white",
  on_hold:           "bg-blue-600 border-blue-600 text-white",
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

const STATUSES = ["new", "on_hold", "in_customs", "awaiting_approval", "delivered", "completed", "cancelled"] as const
const MODULES  = ["shipping", "maintenance", "purchase", "event", "travel", "hr", "general"] as const

const MODULE_STATUSES: Record<string, readonly string[]> = {
  shipping:    ["new", "on_hold", "in_customs", "delivered", "cancelled"],
  maintenance: ["new", "on_hold", "completed", "cancelled"],
  purchase:    ["new", "on_hold", "awaiting_approval", "delivered", "cancelled"],
  event:       ["new", "on_hold", "delivered", "completed", "cancelled"],
  travel:      ["new", "on_hold", "delivered", "completed", "cancelled"],
  hr:          ["new", "on_hold", "completed"],
  general:     ["new", "on_hold", "completed", "cancelled"],
}

const MODULE_STATUS_LABELS: Record<string, Record<string, string>> = {
  shipping:    { new: "New", on_hold: "In Progress", in_customs: "In Customs", delivered: "Delivered", cancelled: "Cancelled" },
  purchase:    { new: "New", on_hold: "In Progress", awaiting_approval: "Awaiting Approval", delivered: "Delivered", cancelled: "Cancelled" },
  maintenance: { new: "New", on_hold: "In Progress", completed: "Completed", cancelled: "Cancelled" },
  event:       { new: "New", on_hold: "In Progress", delivered: "Delivered", completed: "Completed", cancelled: "Cancelled" },
  travel:      { new: "New", on_hold: "In Progress", delivered: "Delivered", completed: "Completed", cancelled: "Cancelled" },
  hr:          { new: "New", on_hold: "In Progress", completed: "Completed" },
  general:     { new: "New", on_hold: "In Progress", completed: "Completed", cancelled: "Cancelled" },
}

const STAT_CARDS = [
  { key: "total",       label: "Total",         accentBg: "bg-slate-800",   accentBorder: "border-slate-800" },
  { key: "new",         label: "New",           accentBg: "bg-sky-500",     accentBorder: "border-sky-500" },
  { key: "in_progress", label: "In Progress",   accentBg: "bg-blue-600",    accentBorder: "border-blue-600" },
  { key: "in_customs",  label: "In Customs",    accentBg: "bg-amber-600",   accentBorder: "border-amber-600" },
  { key: "delivered",   label: "Delivered",     accentBg: "bg-green-600",   accentBorder: "border-green-600" },
  { key: "completed",   label: "Completed",     accentBg: "bg-emerald-600", accentBorder: "border-emerald-600" },
  { key: "cancelled",   label: "Cancelled",     accentBg: "bg-red-600",     accentBorder: "border-red-600" },
] as const

type SortKey = "id" | "title" | "module" | "status" | "createdAt" | "updatedAt" | "requesterName"

const COLS: { key: SortKey; label: string }[] = [
  { key: "id",            label: "Request ID" },
  { key: "title",         label: "Request Title" },
  { key: "createdAt",     label: "Submitted" },
  { key: "requesterName", label: "Requester" },
  { key: "module",        label: "Module" },
  { key: "status",        label: "Status" },
  { key: "updatedAt",     label: "Last Update" },
]

function formatModule(m: string) {
  return m.charAt(0).toUpperCase() + m.slice(1)
}

/**
 * Returns true when the given request was submitted with the current user
 * as the selected Direct Manager.
 *
 * Storage varies by module:
 * - Shipping: payload.approvers.directManager = { name, email }
 * - HR / Purchase / Event / Travel / Maintenance / General:
 *     payload.directManager = "Manager Name" (string; email resolved from Company Data)
 */
function isDirectManagerOf(
  request: EngineRequest,
  currentUserName: string,
  currentUserEmail: string,
): boolean {
  const payload = (request.payload ?? {}) as Record<string, unknown>

  // Shipping path — approvers.directManager = { name, email }
  const approvers = payload?.approvers as Record<string, unknown> | undefined
  const shippingDM = approvers?.directManager as Record<string, unknown> | undefined
  if (shippingDM) {
    if (currentUserEmail && typeof shippingDM.email === "string" &&
        shippingDM.email.toLowerCase() === currentUserEmail) return true
    if (currentUserName && typeof shippingDM.name === "string" &&
        shippingDM.name.toLowerCase() === currentUserName.toLowerCase()) return true
  }

  // HR / Purchase / others — payload.directManager is the manager's display name
  const dmName = payload?.directManager
  if (typeof dmName === "string" && dmName.trim()) {
    if (currentUserName && dmName.toLowerCase() === currentUserName.toLowerCase()) return true
    // Also try resolving the stored name → email via Company Data
    if (currentUserEmail) {
      const resolvedEmail = getManagerEmail(dmName)
      if (resolvedEmail && resolvedEmail.toLowerCase() === currentUserEmail) return true
    }
  }

  return false
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeamRequestsPage() {
  const { data: session } = useSession()
  const currentUserName  = session?.user?.name  ?? ""
  const currentUserEmail = (session?.user?.email ?? "").toLowerCase()
  const canUpdateStatus  = ((session?.user?.permissions as string[])?.includes("update_status") ||
                            (session?.user?.permissions as string[])?.includes("*")) ?? false

  const [requests, setRequests]         = useState<EngineRequest[]>([])
  const [search, setSearch]             = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [moduleFilter, setModuleFilter] = useState("all")
  const [sortKey, setSortKey]           = useState<SortKey>("updatedAt")
  const [sortDir, setSortDir]           = useState<"asc" | "desc">("desc")
  const [colWidths, setColWidths]       = useState<(number | null)[]>(() => COLS.map(() => null))
  const tableRef = useRef<HTMLTableElement>(null)

  const commentCounts = useCommentCounts(requests.map(r => r.id))
  const { viewedComments } = useViewedComments()
  const { newRequestsCount, newTasksCount } = useNewRequestsAndTasks()

  useEffect(() => {
    initializeMockData()
    setRequests(getRequests())

    const onStorage = () => setRequests(getRequests())
    window.addEventListener("storage", onStorage)
    window.addEventListener("arp:storage", onStorage)
    return () => {
      window.removeEventListener("storage", onStorage)
      window.removeEventListener("arp:storage", onStorage)
    }
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
    const onUp = () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
  }, [colWidths])

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("asc") }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronsUpDown className="h-3 w-3 ml-1 opacity-40 shrink-0" />
    return sortDir === "asc"
      ? <ChevronUp className="h-3 w-3 ml-1 shrink-0" />
      : <ChevronDown className="h-3 w-3 ml-1 shrink-0" />
  }

  // All requests where the logged-in user is the selected Direct Manager
  const teamRequests = useMemo(() => {
    if (!currentUserName && !currentUserEmail) return []
    return requests.filter((r) => isDirectManagerOf(r, currentUserName, currentUserEmail))
  }, [requests, currentUserName, currentUserEmail])

  function updateRequestStatus(id: string, nextStatus: string) {
    setRequests((prev) =>
      prev.map((r) => r.id === id ? { ...r, status: nextStatus as EngineRequest["status"], updatedAt: new Date().toISOString() } : r)
    )
  }

  const filtered = useMemo(() => {
    let result = teamRequests
    // stat-card filter maps "in_progress" → "on_hold" for legacy data
    if (statusFilter === "in_progress") {
      result = result.filter((r) => r.status === "on_hold" || (r.status as string) === "in_progress")
    } else if (statusFilter !== "all") {
      result = result.filter((r) => r.status === statusFilter)
    }
    if (moduleFilter !== "all") result = result.filter((r) => r.module === moduleFilter)
    const q = search.trim().toLowerCase()
    if (q) result = result.filter((r) =>
      r.id.toLowerCase().includes(q) ||
      r.title.toLowerCase().includes(q) ||
      r.requesterName.toLowerCase().includes(q)
    )
    return result.sort((a, b) => {
      const av = String(a[sortKey as keyof EngineRequest] ?? "")
      const bv = String(b[sortKey as keyof EngineRequest] ?? "")
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av)
    })
  }, [teamRequests, statusFilter, moduleFilter, search, sortKey, sortDir])

  const counts = useMemo(() => ({
    total:       teamRequests.length,
    new:         teamRequests.filter((r) => r.status === "new").length,
    in_progress: teamRequests.filter((r) => r.status === "on_hold" || (r.status as string) === "in_progress").length,
    in_customs:  teamRequests.filter((r) => r.status === "in_customs" || r.status === "awaiting_approval").length,
    delivered:   teamRequests.filter((r) => r.status === "delivered").length,
    completed:   teamRequests.filter((r) => r.status === "completed").length,
    cancelled:   teamRequests.filter((r) => r.status === "cancelled").length,
  }), [teamRequests])

  const hasUserWidths = colWidths.some((w) => w !== null)

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className={cn("flex items-center justify-between", animationClasses.headerFadeIn)}>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Team Requests</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            All requests where you are selected as the Direct Manager
          </p>
        </div>
        {(newRequestsCount > 0 || newTasksCount > 0) && (
          <NewItemsAlert requestsCount={newRequestsCount} tasksCount={newTasksCount} variant="icon" className="ml-4" />
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-7 gap-4">
        {STAT_CARDS.map(({ key, label, accentBg, accentBorder }, i) => {
          const count = counts[key as keyof typeof counts]
          const active = statusFilter === key || (key === "total" && statusFilter === "all")
          return (
            <button
              key={key}
              onClick={() => setStatusFilter(active && key !== "total" ? "all" : key === "total" ? "all" : key)}
              className={cn(
                "rounded-xl border-2 p-5 text-left transition-all hover:shadow-md",
                animationClasses.statCardStagger(i),
                active
                  ? `${accentBg} ${accentBorder} text-white`
                  : "bg-card border-border hover:border-gray-300"
              )}
            >
              <div className={cn("text-sm font-medium", active ? "text-white/80" : "text-muted-foreground")}>
                {label}
              </div>
              <div className={cn("text-2xl font-bold mt-1", active ? "text-white" : "text-foreground")}>
                {count}
              </div>
            </button>
          )
        })}
      </div>

      {/* Table card */}
      <Card className={cn("overflow-hidden", animationClasses.cardFadeIn)}>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3">
            {/* Search */}
            <div className="relative max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID, title, or requester..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>

            {/* Module filter pills */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setModuleFilter("all")}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                  moduleFilter === "all"
                    ? "bg-slate-700 border-slate-700 text-white"
                    : "bg-background border-border text-muted-foreground hover:bg-muted"
                )}
              >
                All Modules
              </button>
              {MODULES.map((m) => (
                <button
                  key={m}
                  onClick={() => setModuleFilter(moduleFilter === m ? "all" : m)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                    moduleFilter === m
                      ? MODULE_PILL_ACTIVE[m]
                      : "bg-background border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  {formatModule(m)}
                </button>
              ))}
            </div>

            {/* Status filter pills */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setStatusFilter("all")}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                  statusFilter === "all"
                    ? "bg-slate-700 border-slate-700 text-white"
                    : "bg-background border-border text-muted-foreground hover:bg-muted"
                )}
              >
                All Statuses
              </button>
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                    statusFilter === s
                      ? STATUS_PILL_ACTIVE[s]
                      : "bg-background border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <div className="-mx-6 px-6 -mb-6">
          <div className="overflow-x-auto">
            <table
              ref={tableRef}
              className="w-full text-sm"
              style={{ tableLayout: hasUserWidths ? "fixed" : "auto" }}
            >
              <colgroup>
                {COLS.map((col, i) => (
                  <col key={col.key} style={colWidths[i] != null ? { width: colWidths[i]! } : undefined} />
                ))}
                <col />
              </colgroup>
              <thead className="bg-slate-800">
                <tr>
                  {COLS.map((col, i) => (
                    <th
                      key={col.key}
                      className="text-left text-xs font-semibold text-slate-200 px-4 py-3 select-none relative group"
                    >
                      <button
                        onClick={() => handleSort(col.key)}
                        className="flex items-center gap-0.5 hover:text-white transition-colors w-full"
                      >
                        <span className="whitespace-nowrap truncate">{col.label}</span>
                        <SortIcon col={col.key} />
                      </button>
                      <div
                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize opacity-0 group-hover:opacity-100 hover:bg-slate-500 transition-opacity"
                        onMouseDown={(e) => onResizeMouseDown(e, i)}
                      />
                    </th>
                  ))}
                  <th className="bg-slate-800" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={COLS.length + 1} className="text-center py-12 text-muted-foreground">
                      {teamRequests.length === 0
                        ? "No requests found where you are the Direct Manager."
                        : "No requests match the current filters."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((request, idx) => {
                    const unreadCount = (() => {
                      const total = commentCounts[request.id] ?? 0
                      const viewed = viewedComments[request.id] ?? 0
                      return Math.max(0, total - viewed)
                    })()
                    const hasUnread = unreadCount > 0
                    const moduleStatuses = MODULE_STATUSES[request.module] ?? STATUSES
                    const moduleStatusLabels = { ...STATUS_LABELS, ...(MODULE_STATUS_LABELS[request.module] ?? {}) }
                    const { statusColors, statusDot } = buildLabelDrivenMaps(moduleStatuses, moduleStatusLabels)

                    return (
                      <tr
                        key={request.id}
                        className={cn(
                          "border-b border-border transition-colors",
                          hasUnread ? "bg-blue-50/40" : idx % 2 === 0 ? "bg-background" : "bg-muted/20",
                          "hover:bg-muted/40"
                        )}
                      >
                        {/* Request ID */}
                        <td className="px-4 py-3 font-mono text-xs">
                          <div className="flex items-center gap-1.5">
                            <Link
                              href={`/requests/${request.id}`}
                              className="text-blue-600 hover:underline font-semibold"
                            >
                              {request.id}
                            </Link>
                            {unreadCount > 0 && (
                              <span className={cn(
                                "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none",
                                hasUnread ? "bg-red-500 text-white" : "bg-blue-500 text-white"
                              )}>
                                <MessageCircle className="h-2.5 w-2.5" />
                                {unreadCount > 99 ? "99+" : unreadCount}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Title */}
                        <td className="px-4 py-3">
                          <Link
                            href={`/requests/${request.id}`}
                            className="text-sm font-medium text-gray-700 hover:text-blue-600 hover:underline truncate block max-w-xs"
                          >
                            {request.title}
                          </Link>
                        </td>

                        {/* Submitted */}
                        <td className="px-4 py-3 text-sm font-medium text-gray-700 whitespace-nowrap">
                          {fmtDateTime(request.createdAt)}
                        </td>

                        {/* Requester */}
                        <td className="px-4 py-3 text-sm font-medium text-gray-700">
                          {request.requesterName}
                        </td>

                        {/* Module */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <div className={cn("h-2 w-2 rounded-full flex-shrink-0", MODULE_DOT[request.module] ?? "bg-gray-400")} />
                            <span className={cn("text-sm font-medium", MODULE_COLORS[request.module] ?? "text-gray-700")}>
                              {formatModule(request.module)}
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          {canUpdateStatus ? (
                            <InlineStatusSelect
                              currentStatus={request.status}
                              statuses={moduleStatuses}
                              statusColors={statusColors}
                              statusDot={statusDot}
                              statusLabels={moduleStatusLabels}
                              onStatusChange={(nextStatus) => updateRequestStatus(request.id, nextStatus)}
                              canUpdateStatus={canUpdateStatus}
                            />
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <div className={cn("h-2 w-2 rounded-full flex-shrink-0", statusDot[request.status] ?? "bg-gray-400")} />
                              <span className={cn("text-xs font-semibold px-2 py-1 rounded-full border", statusColors[request.status] ?? "bg-gray-100 text-gray-700 border-gray-200")}>
                                {moduleStatusLabels[request.status] ?? request.status}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Last Update */}
                        <td className="px-4 py-3 text-sm font-medium text-gray-700 whitespace-nowrap">
                          {fmtDateTime(request.updatedAt)}
                        </td>

                        <td />
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer count */}
          <div className="px-4 py-3 text-xs text-muted-foreground border-t border-border">
            Showing {filtered.length} of {teamRequests.length} team request{teamRequests.length !== 1 ? "s" : ""}
          </div>
        </div>
      </Card>
    </div>
  )
}
