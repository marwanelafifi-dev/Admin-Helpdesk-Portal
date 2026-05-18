"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { Search, Layers, TrendingUp, Clock, CheckCircle2, ChevronUp, ChevronDown, ChevronsUpDown, ExternalLink } from "lucide-react"
import { Card, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { fetchAllRequests, type EngineRequest } from "@/lib/requests-api"
import { cn } from "@/lib/utils"
import { useSession } from "next-auth/react"
import { StatusDropdown } from "@/components/ui/status-dropdown"
import type { RequestStatus } from "@/components/ui/status-dropdown"
import Link from "next/link"
import { ViewSelector, type ViewDefinition } from "@/components/ui/view-selector"

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

const STATUSES = ["draft", "new", "on_hold", "in_transit", "delivered", "completed", "cancelled"] as const

function formatModule(m: string) { return m.charAt(0).toUpperCase() + m.slice(1) }
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

// ─── Predefined Views ─────────────────────────────────────────────────────────

const ALL_REQUESTS_VIEWS = [
  {
    label: "Status Views",
    views: [
      { id: "all",       label: "All Requests",       filters: {} },
      { id: "active",    label: "All Active Requests", filters: { status: "active" } },
      { id: "new",       label: "New Requests",        filters: { status: "new" } },
      { id: "on_hold",   label: "In Progress",         filters: { status: "on_hold" } },
      { id: "in_transit",label: "In Customs",          filters: { status: "in_transit" } },
      { id: "delivered", label: "Delivered",           filters: { status: "delivered" } },
      { id: "completed", label: "Completed Requests",  filters: { status: "completed" } },
      { id: "cancelled", label: "Cancelled Requests",  filters: { status: "cancelled" } },
    ],
  },
  {
    label: "Module Views",
    views: [
      { id: "mod-shipping",    label: "Shipping Module",     filters: { module: "shipping" } },
      { id: "mod-hr",          label: "HR Module",           filters: { module: "hr" } },
      { id: "mod-maintenance", label: "Maintenance Module",  filters: { module: "maintenance" } },
      { id: "mod-purchase",    label: "Purchase Module",     filters: { module: "purchase" } },
      { id: "mod-event",       label: "Event Module",        filters: { module: "event" } },
      { id: "mod-travel",      label: "Travel Module",       filters: { module: "travel" } },
    ],
  },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

type ModuleTab = "all" | "shipping" | "maintenance" | "purchase" | "event" | "travel" | "hr"
type SortKey = "id" | "title" | "requesterName" | "createdAt" | "module" | "status" | "updatedAt"
type SortDir = "asc" | "desc"

export default function AllRequestsPage() {
  const { data: session } = useSession()
  const [requests, setRequests]         = useState<EngineRequest[]>([])
  const [search, setSearch]             = useState("")
  const [activeTab, setActiveTab]       = useState<ModuleTab>("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortKey, setSortKey]           = useState<SortKey>("updatedAt")
  const [sortDir, setSortDir]           = useState<SortDir>("desc")
  const [updatingId, setUpdatingId]     = useState<string | null>(null)
  const [selectedIds, setSelectedIds]   = useState<string[]>([])
  const [bulkStatus, setBulkStatus]     = useState<RequestStatus>("on_hold")
  const [bulkUpdating, setBulkUpdating] = useState(false)
  const selectAllRef                    = useRef<HTMLInputElement | null>(null)
  const [activeViewId, setActiveViewId] = useState("all")

  function handleSelectView(view: ViewDefinition) {
    setActiveViewId(view.id)
    setSearch("")
    setStatusFilter(view.filters.status ?? "all")
    setActiveTab((view.filters.module as ModuleTab) ?? "all")
  }

  // ── Column resize ──────────────────────────────────────────────────────────
  const isAdmin = session?.user?.role === 'super_admin' || session?.user?.role === 'admin'
  
  const COLS = useMemo(() => [
    { key: "id"            as SortKey, label: "Request ID",      defaultW: 140 },
    { key: "title"         as SortKey, label: "Request Title",   defaultW: 200 },
    { key: "createdAt"     as SortKey, label: "Submission Date", defaultW: 130 },
    { key: "requesterName" as SortKey, label: "Requester Name",  defaultW: 150 },
    { key: "module"        as SortKey, label: "Module",          defaultW: 110 },
    { key: "status"        as SortKey, label: "Status",          defaultW: 120 },
    { key: "updatedAt"     as SortKey, label: "Last Update Date",defaultW: 140 },
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

  // ── Data fetching ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchAllRequests().then(setRequests)
  }, [])

  // ── Filtered data computation ──────────────────────────────────────────────
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

  // ── Selection state (declare before useEffect) ──────────────────────────────
  const allVisibleIds = useMemo(() => filtered.map((req) => req.id), [filtered])
  
  const selectedVisibleCount = useMemo(
    () => allVisibleIds.filter((id) => selectedIds.includes(id)).length,
    [allVisibleIds, selectedIds]
  )
  
  const allVisibleSelected = useMemo(
    () => filtered.length > 0 && selectedVisibleCount === filtered.length,
    [filtered.length, selectedVisibleCount]
  )
  
  const partiallySelected = useMemo(
    () => selectedVisibleCount > 0 && selectedVisibleCount < filtered.length,
    [selectedVisibleCount, filtered.length]
  )

  // ── Update select-all checkbox when selection changes ──────────────────────
  useEffect(() => {
    if (!selectAllRef.current) return
    selectAllRef.current.indeterminate = partiallySelected
  }, [partiallySelected])

  // ── Sync selected IDs with filtered list ────────────────────────────────────
  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => allVisibleIds.includes(id)))
  }, [allVisibleIds])

  // ── Stats ──────────────────────────────────────────────────────────────────
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

  const handleStatusChange = async (requestId: string, module: string, newStatus: RequestStatus) => {
    setUpdatingId(requestId)
    try {
      const response = await fetch(`/api/requests/${module}/${requestId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': session?.user?.id || '',
          'x-user-role': session?.user?.role || '',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        // Update local state
        setRequests((prev) =>
          prev.map((r) =>
            r.id === requestId
              ? { ...r, status: newStatus as unknown as typeof r.status, updatedAt: new Date().toISOString() }
              : r
          )
        )
      }
    } catch (error) {
      console.error('Failed to update status:', error)
    } finally {
      setUpdatingId(null)
    }
  }

  const toggleOne = (requestId: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...new Set([...prev, requestId])] : prev.filter((id) => id !== requestId)
    )
  }

  const toggleAllVisible = (checked: boolean) => {
    setSelectedIds((prev) => {
      if (checked) return [...new Set([...prev, ...allVisibleIds])]
      return prev.filter((id) => !allVisibleIds.includes(id))
    })
  }

  const handleBulkStatusChange = async () => {
    if (selectedIds.length === 0) return

    setBulkUpdating(true)
    try {
      const response = await fetch("/api/requests/status/bulk", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestIds: selectedIds,
          status: bulkStatus,
        }),
      })

      if (!response.ok) return

      const payload = await response.json() as {
        requestIds: string[]
        status: RequestStatus
      }

      setRequests((prev) =>
        prev.map((request) =>
          payload.requestIds.includes(request.id)
            ? {
                ...request,
                status: payload.status as typeof request.status,
                updatedAt: new Date().toISOString(),
              }
            : request
        )
      )
      setSelectedIds([])
    } catch (error) {
      console.error("Failed to bulk update statuses:", error)
    } finally {
      setBulkUpdating(false)
    }
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <ViewSelector
            groups={ALL_REQUESTS_VIEWS}
            activeViewId={activeViewId}
            onSelect={handleSelectView}
          />
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
                isActive ? `${activeBg} ${activeBorder} text-white shadow-sm` : "bg-card border-border hover:border-primary/40 dark:hover:border-primary/60"
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

          {isAdmin && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/80 px-4 py-3">
              <p className="text-sm font-medium text-slate-700">
                {selectedIds.length} selected
              </p>
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value as RequestStatus)}
                className="h-10 rounded-lg border border-blue-200 bg-white px-3 text-sm text-slate-700 shadow-sm"
              >
                {[
                  "draft",
                  "new",
                  "on_hold",
                  "in_customs",
                  "in_transit",
                  "delivered",
                  "completed",
                  "cancelled",
                ].map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status] ?? status}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                disabled={selectedIds.length === 0 || bulkUpdating}
                onClick={handleBulkStatusChange}
              >
                {bulkUpdating ? "Updating..." : "Update Selected"}
              </Button>
              {selectedIds.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={bulkUpdating}
                  onClick={() => setSelectedIds([])}
                >
                  Clear Selection
                </Button>
              )}
            </div>
          )}

          <p className="text-sm text-muted-foreground font-normal mt-1">
            Showing {filtered.length} request{filtered.length !== 1 ? "s" : ""}
          </p>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ tableLayout: "fixed", minWidth: colWidths.reduce((a, b) => a + b, isAdmin ? 52 : 0) }}>
            <colgroup>
              {isAdmin && <col style={{ width: 52 }} />}
              {colWidths.map((w, i) => <col key={i} style={{ width: w }} />)}
            </colgroup>
            <thead>
              <tr className="bg-slate-800 border-b border-slate-700">
                {isAdmin && (
                  <th className="py-3 pl-5 pr-2 text-left">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={(e) => toggleAllVisible(e.target.checked)}
                      aria-label="Select all visible requests"
                      className="h-4 w-4 rounded border-slate-500 bg-slate-900 accent-sky-500"
                    />
                  </th>
                )}
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
              </tr>
            </thead>
            <tbody>
              {filtered.map((req, i) => (
                <tr
                  key={req.id}
                  className={cn(
                    "border-b border-gray-100 hover:bg-blue-50/30 transition-colors",
                    i % 2 === 0 ? "bg-card" : "bg-muted/20"
                  )}
                >
                  {isAdmin && (
                    <td className="py-3 pl-5 pr-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(req.id)}
                        onChange={(e) => toggleOne(req.id, e.target.checked)}
                        aria-label={`Select request ${req.id}`}
                        className="h-4 w-4 rounded border-slate-300 accent-sky-600"
                      />
                    </td>
                  )}
                  <td className="py-3 overflow-hidden" style={{ paddingLeft: 20, paddingRight: 8 }}>
                    <Link href={`/${req.module}/${req.id}`}>
                      <span className="text-sm font-medium text-blue-600 hover:text-blue-800 truncate block flex items-center gap-1 cursor-pointer">
                        {req.id}
                        <ExternalLink className="h-3 w-3" />
                      </span>
                    </Link>
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
                    {isAdmin ? (
                      <StatusDropdown
                        currentStatus={req.status as RequestStatus}
                        onStatusChange={(newStatus) => handleStatusChange(req.id, req.module, newStatus)}
                        disabled={updatingId === req.id}
                        compact={true}
                        adminOnly={true}
                      />
                    ) : (
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap",
                        STATUS_COLORS[req.status] ?? "bg-zinc-100 text-zinc-600"
                      )}>
                        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", STATUS_DOT[req.status] ?? "bg-gray-400")} />
                        {STATUS_LABELS[req.status] ?? req.status}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-sm font-medium text-gray-700 whitespace-nowrap">{formatDate(req.updatedAt)}</span>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="text-center text-gray-400 text-sm py-16">
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
