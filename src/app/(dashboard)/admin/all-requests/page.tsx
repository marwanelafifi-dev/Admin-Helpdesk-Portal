"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import Link from "next/link"
import { Search, Layers, TrendingUp, Clock, CheckCircle2, ChevronUp, ChevronDown, ChevronsUpDown, MessageCircle } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { getRequests, initializeMockData, updateStatus, type EngineRequest, type RequestStatus } from "@/services/engineService"
import { cn } from "@/lib/utils"
import { useCommentCounts } from "@/hooks/useCommentCounts"
import { useViewedComments } from "@/hooks/useViewedComments"
import { useExpandedRows } from "@/hooks/useExpandedRows"
import { InlineStatusSelect } from "@/components/ui/InlineStatusSelect"
import { RequestActionsMenu } from "@/components/ui/RequestActionsMenu"

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft", new: "New", on_hold: "In Progress", in_transit: "In Customs", "In Progress": "In Progress", "In Customs": "In Customs", "In Transit": "In Customs",
  delivered: "Delivered", completed: "Completed", cancelled: "Cancelled",
}

const STATUS_COLORS: Record<string, string> = {
  draft:      "bg-zinc-100 text-zinc-600",
  new:        "bg-sky-50 text-sky-700",
  on_hold:    "bg-amber-50 text-amber-700",
  in_transit: "bg-blue-50 text-blue-700",
  "In Progress": "bg-blue-50 text-blue-700",
  "In Customs": "bg-amber-50 text-amber-700",
  "In Transit": "bg-blue-50 text-blue-700",
  delivered:  "bg-green-50 text-green-700",
  completed:  "bg-emerald-50 text-emerald-700",
  cancelled:  "bg-red-50 text-red-600",
}

const STATUS_DOT: Record<string, string> = {
  draft: "bg-zinc-400", new: "bg-sky-500", on_hold: "bg-amber-500",
  in_transit: "bg-blue-500", "In Progress": "bg-blue-500", "In Customs": "bg-amber-500", "In Transit": "bg-blue-500",
  delivered: "bg-green-500",
  completed: "bg-emerald-500", cancelled: "bg-red-500",
}

const MODULE_COLORS: Record<string, string> = {
  shipping: "text-blue-700", maintenance: "text-purple-700",
  purchase: "text-green-700", event: "text-orange-600",
  travel: "text-pink-600", hr: "text-teal-700",
}

const MODULE_DOT: Record<string, string> = {
  shipping: "bg-blue-500", maintenance: "bg-purple-500",
  purchase: "bg-green-500", event: "bg-orange-500",
  travel: "bg-pink-500", hr: "bg-teal-500",
}

const MODULES  = ["shipping", "maintenance", "purchase", "event", "travel", "hr"] as const
const STATUSES = ["draft", "new", "on_hold", "in_transit", "delivered", "completed", "cancelled"] as const

// Module-specific statuses
const MODULE_STATUSES: Record<string, readonly string[]> = {
  shipping: ["new", "in_customs", "delivered", "cancelled"],
  maintenance: ["new", "on_hold", "completed", "cancelled"],
  purchase: ["new", "in_customs", "on_hold", "delivered", "cancelled"],
  event: ["new", "on_hold", "in_transit", "delivered", "completed", "cancelled"],
  travel: ["new", "on_hold", "in_transit", "delivered", "completed", "cancelled"],
  hr: ["new", "on_hold", "completed"],
}

function formatModule(m: string) { return m.charAt(0).toUpperCase() + m.slice(1) }
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type ModuleTab = "all" | typeof MODULES[number]
type SortKey = "id" | "title" | "requesterName" | "createdAt" | "module" | "status" | "updatedAt"
type SortDir = "asc" | "desc"

export default function AllRequestsPage() {
  const [requests, setRequests]         = useState<EngineRequest[]>([])
  const [search, setSearch]             = useState("")
  const [activeTab, setActiveTab]       = useState<ModuleTab>("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortKey, setSortKey]           = useState<SortKey>("updatedAt")
  const [sortDir, setSortDir]           = useState<SortDir>("desc")
  const { isExpanded, toggleRow } = useExpandedRows()

  // ── Column resize ──────────────────────────────────────────────────────────
  const COLS = useMemo(() => [
    { key: "id"            as SortKey, label: "Request ID",      defaultW: 140 },
    { key: "title"         as SortKey, label: "Request Title",   defaultW: 200 },
    { key: "createdAt"     as SortKey, label: "Submission Date", defaultW: 130 },
    { key: "requesterName" as SortKey, label: "Requester Name",  defaultW: 150 },
    { key: "module"        as SortKey, label: "Module",          defaultW: 110 },
    { key: "status"        as SortKey, label: "Status",          defaultW: 120 },
    { key: "updatedAt"     as SortKey, label: "Last Update Date",defaultW: 140 },
    { key: "actions"       as SortKey, label: "",                defaultW: 50   },
  ], [])

  const [colWidths, setColWidths] = useState<number[]>(() => COLS.map((c) => c.defaultW))
  const resizingCol  = useRef<number | null>(null)
  const resizeStartX = useRef(0)
  const resizeStartW = useRef(0)

  const onResizeMouseDown = useCallback((e: React.MouseEvent, idx: number) => {
    e.preventDefault()
    e.stopPropagation()
    resizingCol.current  = idx
    resizeStartX.current = e.clientX
    resizeStartW.current = colWidths[idx]

    const onMove = (ev: MouseEvent) => {
      if (resizingCol.current === null) return
      const delta = ev.clientX - resizeStartX.current
      const newW  = Math.max(60, resizeStartW.current + delta)
      setColWidths((prev) => prev.map((w, i) => i === resizingCol.current ? newW : w))
    }
    const onUp = () => {
      resizingCol.current = null
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

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        initializeMockData()
        setRequests(getRequests())
      } catch (error) {
        console.error("Failed to fetch requests:", error)
      }
    }

    fetchRequests()
  }, [])

  const commentCounts = useCommentCounts(requests.map(r => r.id))
  const { viewedComments } = useViewedComments()

  const filtered = useMemo(() => {
    let result = requests
    if (activeTab !== "all") result = result.filter((r) => r.module === activeTab)
    if (statusFilter === "active") result = result.filter((r) => !["cancelled", "completed", "delivered"].includes(r.status))
    else if (statusFilter !== "all") result = result.filter((r) => r.status === statusFilter)
    const q = search.trim().toLowerCase()
    if (q) result = result.filter((r) =>
      r.id.toLowerCase().includes(q) ||
      r.title.toLowerCase().includes(q) ||
      r.requesterName.toLowerCase().includes(q)
    )
    return result.sort((a, b) => {
      let av: string = "", bv: string = ""
      if (sortKey === "createdAt" || sortKey === "updatedAt") {
        const diff = new Date(a[sortKey]).getTime() - new Date(b[sortKey]).getTime()
        return sortDir === "asc" ? diff : -diff
      }
      av = (a[sortKey] as string) ?? ""
      bv = (b[sortKey] as string) ?? ""
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av)
    })
  }, [requests, activeTab, statusFilter, search, sortKey, sortDir])

  const stats = useMemo(() => ({
    total:     requests.length,
    new:       requests.filter((r) => r.status === "new").length,
    onHold:    requests.filter((r) => r.status === "on_hold").length,
    completed: requests.filter((r) => r.status === "completed").length,
  }), [requests])

  const tabCount = (tab: ModuleTab) =>
    tab === "all" ? requests.length : requests.filter((r) => r.module === tab).length

  const tabs: { key: ModuleTab; label: string }[] = [
    { key: "all",         label: "All" },
    { key: "hr",          label: "HR" },
    { key: "shipping",    label: "Shipping" },
    { key: "maintenance", label: "Maintenance" },
    { key: "purchase",    label: "Purchase" },
    { key: "event",       label: "Event" },
    { key: "travel",      label: "Travel" },
  ]

  const handleStatusChange = (id: string, newStatus: string) => {
    setRequests(prev => prev.map(r =>
      r.id === id ? { ...r, status: newStatus as RequestStatus, updatedAt: new Date().toISOString() } : r
    ))
    updateStatus(id, newStatus as RequestStatus, "USR-001")
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">All Requests</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            All requests submitted by administration team members
          </p>
        </div>
      </div>

      {/* Stat Cards — clickable, synced with status filter */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {([
          { key: "all",       label: "Total Requests", value: stats.total,     icon: Layers,       iconBg: "bg-slate-100",   iconColor: "text-slate-600",   activeBg: "bg-slate-800",   activeBorder: "border-slate-800" },
          { key: "new",       label: "New",            value: stats.new,       icon: TrendingUp,   iconBg: "bg-sky-50",      iconColor: "text-sky-600",     activeBg: "bg-sky-500",     activeBorder: "border-sky-500" },
          { key: "on_hold",   label: "In Progress",     value: stats.onHold,    icon: Clock,        iconBg: "bg-amber-50",    iconColor: "text-amber-600",   activeBg: "bg-amber-500",   activeBorder: "border-amber-500" },
          { key: "completed", label: "Completed",      value: stats.completed, icon: CheckCircle2, iconBg: "bg-emerald-50",  iconColor: "text-emerald-600", activeBg: "bg-emerald-600", activeBorder: "border-emerald-600" },
        ] as const).map(({ key, label, value, icon: Icon, iconBg, iconColor, activeBg, activeBorder }) => {
          const isActive = statusFilter === key || (key === "all" && statusFilter === "all")
          return (
            <button
              key={key}
              onClick={() => setStatusFilter(key === "all" ? "all" : (p) => p === key ? "all" : key)}
              className={cn(
                "text-left rounded-xl border-2 p-5 flex items-center gap-4 transition-all hover:shadow-md",
                isActive ? `${activeBg} ${activeBorder} text-white shadow-sm` : "bg-white border-gray-100 hover:border-gray-200"
              )}
            >
              <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all", isActive ? "bg-white/20" : iconBg)}>
                <Icon className={cn("h-6 w-6 transition-all", isActive ? "text-white" : iconColor)} />
              </div>
              <div>
                <p className={cn("text-sm font-medium transition-all", isActive ? "text-white/80" : "text-muted-foreground")}>{label}</p>
                <p className={cn("text-2xl font-bold", isActive ? "text-white" : "")}>{value}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Table Card */}
      <Card>
        <CardHeader className="pb-4">

          {/* Module Tabs */}
          <div className="flex gap-1 border-b pb-3 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition whitespace-nowrap ${
                  activeTab === tab.key
                    ? "bg-slate-900 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {tab.label}
                <span className={`ml-2 text-xs font-normal ${activeTab === tab.key ? "text-gray-300" : "text-gray-400"}`}>
                  ({tabCount(tab.key)})
                </span>
              </button>
            ))}
          </div>

          {/* Search + Status filter */}
          <div className="flex flex-wrap gap-3 mt-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID, title, or requester..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Status quick pills */}
            <div className="flex flex-wrap gap-1.5 items-center">
              {(["all", "active", ...STATUSES] as const).map((s) => {
                const activeClass = s === "all" ? "bg-slate-900 border-slate-900 text-white"
                  : s === "active" ? "bg-indigo-600 border-indigo-600 text-white" : {
                  draft:      "bg-zinc-500 border-zinc-500 text-white",
                  new:        "bg-sky-500 border-sky-500 text-white",
                  on_hold:    "bg-amber-500 border-amber-500 text-white",
                  in_transit: "bg-blue-600 border-blue-600 text-white",
                  delivered:  "bg-green-600 border-green-600 text-white",
                  completed:  "bg-emerald-600 border-emerald-600 text-white",
                  cancelled:  "bg-red-600 border-red-600 text-white",
                  "In Progress": "bg-blue-600 border-blue-600 text-white",
                  "In Customs": "bg-amber-600 border-amber-600 text-white",
                }[s]
                return (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={cn(
                      "h-8 px-3 rounded-md text-xs font-medium border transition-all",
                      statusFilter === s
                        ? activeClass
                        : "bg-white border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700"
                    )}
                  >
                    {s === "all" ? "All Statuses" : s === "active" ? "Active" : STATUS_LABELS[s]}
                  </button>
                )
              })}
            </div>
          </div>

          <p className="text-sm text-muted-foreground font-normal mt-1">
            Showing {filtered.length} request{filtered.length !== 1 ? "s" : ""}
          </p>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ tableLayout: "fixed", minWidth: colWidths.reduce((a, b) => a + b, 0) }}>
            <colgroup>
              {colWidths.map((w, i) => <col key={i} style={{ width: w }} />)}
              <col style={{ width: "auto" }} />
            </colgroup>
            <thead className="bg-slate-800">
              <tr className="border-b border-slate-700">
                {COLS.map((col, idx) => (
                  <th
                    key={col.key}
                    className="relative py-3 text-xs font-semibold text-slate-300 tracking-wide text-left select-none group"
                    style={{ paddingLeft: idx === 0 ? 20 : 12, paddingRight: 8 }}
                  >
                    {/* Sort trigger */}
                    <button
                      onClick={() => handleSort(col.key)}
                      className="inline-flex items-center gap-0.5 hover:text-white transition-colors w-full"
                    >
                      {col.label}
                      <SortIcon col={col.key} />
                    </button>

                    {/* Resize handle */}
                    {idx < COLS.length - 1 && (
                      <span
                        onMouseDown={(e) => onResizeMouseDown(e, idx)}
                        className="absolute right-0 top-0 h-full w-4 flex items-center justify-center cursor-col-resize z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <span className="w-px h-4 bg-slate-500 rounded" />
                      </span>
                    )}
                  </th>
                ))}
                <th className="py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((req, i) => {
                const hasUnreadComments = (commentCounts[req.id] ?? 0) > (viewedComments[req.id] ?? 0)
                const moduleStatuses = MODULE_STATUSES[req.module] || []
                return (
                <>
                <tr
                  key={req.id}
                  className={cn(
                    "border-b border-gray-100 hover:bg-blue-50/30 transition-colors",
                    hasUnreadComments ? "bg-blue-50" : (i % 2 === 0 ? "bg-white" : "bg-gray-50/40")
                  )}
                >
                  <td className="py-3 overflow-hidden" style={{ paddingLeft: 20, paddingRight: 8 }}>
                    <div className="flex items-center gap-2">
                      <Link href={`/requests/${req.id}?source=all-requests`} className="text-sm font-medium text-blue-600 truncate block hover:underline">
                        {req.id}
                      </Link>
                      {(commentCounts[req.id] ?? 0) > 0 && (
                        <span className={cn("flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap flex-shrink-0", hasUnreadComments ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700")}>
                          <MessageCircle className="h-3 w-3" />
                          {commentCounts[req.id]}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 overflow-hidden">
                    <span className="text-sm font-medium text-gray-700 truncate block">{req.title}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-sm font-medium text-gray-700 whitespace-nowrap">{formatDate(req.createdAt)}</span>
                  </td>
                  <td className="py-3 px-3 overflow-hidden">
                    <div className="text-sm font-medium text-gray-700 truncate">{req.requesterName}</div>
                    <div className="text-sm font-medium text-gray-600 truncate">{req.requesterEmail}</div>
                  </td>
                  <td className="py-3 px-3">
                    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", MODULE_COLORS[req.module] ?? "text-gray-600")}>
                      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", MODULE_DOT[req.module] ?? "bg-gray-400")} />
                      {formatModule(req.module)}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <InlineStatusSelect
                      currentStatus={req.status}
                      statuses={moduleStatuses}
                      statusColors={STATUS_COLORS}
                      statusDot={STATUS_DOT}
                      statusLabels={STATUS_LABELS}
                      onStatusChange={(newStatus) => handleStatusChange(req.id, newStatus)}
                    />
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-sm font-medium text-gray-700 whitespace-nowrap">{formatDate(req.updatedAt)}</span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <RequestActionsMenu
                      requestId={req.id}
                      showCancelOption={false}
                      isExpanded={isExpanded(req.id)}
                      onViewDetails={() => toggleRow(req.id)}
                      onEdit={(id) => {
                        const route = req.module === "shipping" ? "/shipping/new"
                          : req.module === "hr" ? "/hr/new"
                          : req.module === "maintenance" ? "/maintenance/new"
                          : req.module === "purchase" ? "/purchase/new"
                          : req.module === "event" ? "/event/new"
                          : req.module === "travel" ? "/travel/new"
                          : "/shipping/new"
                        window.open(`${route}?id=${id}`, '_blank')
                      }}
                    />
                  </td>
                  <td />
                </tr>
                {isExpanded(req.id) && (
                  <tr className="bg-blue-50">
                    <td colSpan={8} className="py-4 px-6">
                      <div className="space-y-3 text-sm">
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <p className="font-semibold text-gray-700">Title</p>
                            <p className="text-gray-600">{req.title}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-700">Module</p>
                            <p className="text-gray-600">{formatModule(req.module)}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-700">Requester</p>
                            <p className="text-gray-600">{req.requesterName} ({req.requesterEmail})</p>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-700">Status</p>
                            <p className="text-gray-600">{STATUS_LABELS[req.status] || req.status}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-700">Submission Date</p>
                            <p className="text-gray-600">{formatDate(req.createdAt)}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-700">Last Update</p>
                            <p className="text-gray-600">{formatDate(req.updatedAt)}</p>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                </>
              )
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-gray-400 text-sm py-16">
                    No records match the current filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {filtered.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 text-[11px] text-gray-400 text-right">
              Showing {filtered.length} of {requests.length} requests
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
