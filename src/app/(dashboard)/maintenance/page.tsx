"use client"

import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { Search, Plus, Wrench, Clock, CheckCircle2, ChevronUp, ChevronDown, ChevronsUpDown, MessageCircle } from "lucide-react"
import { Card, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { getRequests, initializeMockData, updateStatus, type EngineRequest, type RequestStatus } from "@/services/engineService"
import { cn } from "@/lib/utils"
import { requestsAPI } from "@/lib/apiClient"
import { useCommentCounts } from "@/hooks/useCommentCounts"
import { useViewedComments } from "@/hooks/useViewedComments"
import { InlineStatusSelect } from "@/components/ui/InlineStatusSelect"

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  new: "New", on_hold: "In Progress",
  completed: "Completed", cancelled: "Cancelled",
}

const STATUS_COLORS: Record<string, string> = {
  new: "bg-sky-50 text-sky-700", on_hold: "bg-amber-50 text-amber-700",
  completed: "bg-emerald-50 text-emerald-700", cancelled: "bg-red-50 text-red-600",
}

const STATUS_DOT: Record<string, string> = {
  new: "bg-sky-500", on_hold: "bg-amber-500",
  completed: "bg-emerald-500", cancelled: "bg-red-500",
}

const STATUS_PILL_ACTIVE: Record<string, string> = {
  new: "bg-sky-500 border-sky-500 text-white",
  on_hold: "bg-amber-500 border-amber-500 text-white",
  completed: "bg-emerald-600 border-emerald-600 text-white",
  cancelled: "bg-red-600 border-red-600 text-white",
}

const STATUSES = ["new", "on_hold", "completed", "cancelled"] as const

type SortKey = "id" | "title" | "createdAt" | "requesterName" | "priority" | "status" | "updatedAt"

const COLS: { key: SortKey; label: string; defaultW: number }[] = [
  { key: "id",            label: "Request ID",      defaultW: 130 },
  { key: "title",         label: "Request Title",   defaultW: 200 },
  { key: "createdAt",     label: "Submission Date", defaultW: 140 },
  { key: "requesterName", label: "Requester Name",  defaultW: 160 },
  { key: "priority",      label: "Priority",        defaultW: 110 },
  { key: "status",        label: "Status",          defaultW: 130 },
  { key: "updatedAt",     label: "Last Update Date",defaultW: 140 },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MaintenancePage() {
  const [requests, setRequests]           = useState<EngineRequest[]>([])
  const [search, setSearch]               = useState("")
  const [statusFilter, setStatusFilter]   = useState("all")
  const [sortKey, setSortKey]             = useState<SortKey>("updatedAt")
  const [sortDir, setSortDir]             = useState<"asc" | "desc">("desc")
  const [colWidths, setColWidths]         = useState<number[]>(() => COLS.map((c) => c.defaultW))
  const resizingCol  = useRef<number | null>(null)
  const resizeStartX = useRef(0)
  const resizeStartW = useRef(0)

  const commentCounts = useCommentCounts(requests.map(r => r.id))
  const { viewedComments } = useViewedComments()

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const data = await requestsAPI.listByModule("maintenance")
        setRequests(data.data || [])
      } catch (error) {
        console.error("Failed to fetch maintenance requests:", error)
        initializeMockData()
        setRequests(getRequests().filter((r) => r.module === "maintenance"))
      }
    }

    fetchRequests()
  }, [])

  async function handleStatusChange(id: string, newStatus: string) {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus as RequestStatus, updatedAt: new Date().toISOString() } : r))
    try {
      await requestsAPI.updateStatus(id, newStatus)
    } catch {
      updateStatus(id, newStatus as RequestStatus, "USR-001")
    }
  }

  const onResizeMouseDown = useCallback((e: React.MouseEvent, idx: number) => {
    e.preventDefault(); e.stopPropagation()
    resizingCol.current = idx
    resizeStartX.current = e.clientX
    resizeStartW.current = colWidths[idx]
    const onMove = (ev: MouseEvent) => {
      if (resizingCol.current === null) return
      const newW = Math.max(60, resizeStartW.current + ev.clientX - resizeStartX.current)
      setColWidths((prev) => prev.map((w, i) => i === resizingCol.current ? newW : w))
    }
    const onUp = () => { resizingCol.current = null; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp) }
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

  const filtered = useMemo(() => {
    let result = requests
    if (statusFilter !== "all") result = result.filter((r) => r.status === statusFilter)
    const q = search.trim().toLowerCase()
    if (q) result = result.filter((r) => r.id.toLowerCase().includes(q) || r.title.toLowerCase().includes(q))
    return result.sort((a, b) => {
      let av: string, bv: string
      if (sortKey === "priority") {
        av = String((a.payload as Record<string, unknown>).priority ?? "")
        bv = String((b.payload as Record<string, unknown>).priority ?? "")
      } else if (sortKey === "requesterName") {
        av = a.requesterName ?? ""
        bv = b.requesterName ?? ""
      } else {
        av = String(a[sortKey as keyof EngineRequest] ?? "")
        bv = String(b[sortKey as keyof EngineRequest] ?? "")
      }
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av)
    })
  }, [requests, statusFilter, search, sortKey, sortDir])

  const counts = useMemo(() => ({
    total:     requests.length,
    new:       requests.filter((r) => r.status === "new").length,
    inProgress:requests.filter((r) => r.status === "on_hold").length,
    completed: requests.filter((r) => r.status === "completed").length,
  }), [requests])

  const statCards = [
    { key: "all",       label: "Total Tickets", value: counts.total,      icon: Wrench,       iconBg: "bg-blue-50",   iconColor: "text-blue-600",   activeBg: "bg-slate-800",  activeBorder: "border-slate-800" },
    { key: "new",       label: "New",           value: counts.new,        icon: Clock,        iconBg: "bg-sky-50",    iconColor: "text-sky-600",    activeBg: "bg-sky-500",    activeBorder: "border-sky-500" },
    { key: "on_hold",   label: "In Progress",   value: counts.inProgress, icon: Wrench,       iconBg: "bg-amber-50",  iconColor: "text-amber-600",  activeBg: "bg-amber-500",  activeBorder: "border-amber-500" },
    { key: "completed", label: "Completed",     value: counts.completed,  icon: CheckCircle2, iconBg: "bg-emerald-50",iconColor: "text-emerald-600",activeBg: "bg-emerald-600",activeBorder: "border-emerald-600" },
  ] as const

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Maintenance</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Submit and track maintenance requests</p>
        </div>
        <Link href="/maintenance/new">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            New Maintenance Request
          </Button>
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map(({ key, label, value, icon: Icon, iconBg, iconColor, activeBg, activeBorder }) => {
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
                <p className={cn("text-sm font-medium", isActive ? "text-white/80" : "text-muted-foreground")}>{label}</p>
                <p className={cn("text-2xl font-bold", isActive ? "text-white" : "")}>{value}</p>
              </div>
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
                placeholder="Search by ID or title…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-1.5 items-center">
              {(["all", ...STATUSES] as const).map((s) => {
                const activeClass = s === "all" ? "bg-slate-900 border-slate-900 text-white" : STATUS_PILL_ACTIVE[s]
                return (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={cn(
                      "h-8 px-3 rounded-md text-xs font-medium border transition-all",
                      statusFilter === s ? activeClass : "bg-white border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700"
                    )}
                  >
                    {s === "all" ? "All Statuses" : STATUS_LABELS[s]}
                  </button>
                )
              })}
            </div>
          </div>
          <p className="text-sm text-muted-foreground font-normal mt-1">
            Showing {filtered.length} ticket{filtered.length !== 1 ? "s" : ""}
          </p>
        </CardHeader>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ tableLayout: "fixed", minWidth: colWidths.reduce((a, b) => a + b, 0) }}>
            <colgroup>
              {colWidths.map((w, i) => <col key={i} style={{ width: w }} />)}
            </colgroup>
            <thead>
              <tr className="bg-slate-800 border-b border-slate-700 hover:bg-slate-800">
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
              </tr>
            </thead>
            <tbody>
              {filtered.map((req, i) => {
                const hasUnreadComments = (commentCounts[req.id] ?? 0) > (viewedComments[req.id] ?? 0)
                return (
                <tr key={req.id} className={cn("border-b border-gray-100 hover:bg-blue-50/30 transition-colors", hasUnreadComments ? "bg-blue-50" : (i % 2 === 0 ? "bg-white" : "bg-gray-50/40"))}>
                  <td className="py-3 overflow-hidden" style={{ paddingLeft: 20, paddingRight: 8 }}>
                    <div className="flex items-center gap-2">
                      <Link href={`/requests/${req.id}?source=maintenance`} className="text-sm font-medium text-blue-600 truncate hover:underline">
                        {req.id}
                      </Link>
                      {(commentCounts[req.id] ?? 0) > 0 && (
                        <span className={cn(
                          "inline-flex items-center gap-1 flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-semibold",
                          hasUnreadComments
                            ? "bg-red-100 text-red-700"
                            : "bg-blue-50 text-blue-600"
                        )}>
                          <MessageCircle className="h-3 w-3" />
                          {commentCounts[req.id]}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 overflow-hidden">
                    <span className="text-sm font-medium text-gray-700 truncate block">{req.title}</span>
                  </td>
                  <td className="py-3 px-3 overflow-hidden">
                    <span className="text-sm font-medium text-gray-700 truncate block">{formatDate(req.createdAt)}</span>
                  </td>
                  <td className="py-3 px-3 overflow-hidden">
                    <span className="text-sm font-medium text-gray-700 truncate block">{req.requesterName}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className={cn("text-sm font-medium",
                      (req.payload as Record<string, unknown>).priority === "High" ? "text-red-600" :
                      (req.payload as Record<string, unknown>).priority === "Medium" ? "text-amber-600" : "text-gray-700"
                    )}>
                      {String((req.payload as Record<string, unknown>).priority ?? "—")}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <InlineStatusSelect
                      currentStatus={req.status}
                      statuses={STATUSES}
                      statusColors={STATUS_COLORS}
                      statusDot={STATUS_DOT}
                      statusLabels={STATUS_LABELS}
                      onStatusChange={(newStatus) => handleStatusChange(req.id, newStatus)}
                    />
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-sm font-medium text-gray-700">{formatDate(req.updatedAt)}</span>
                  </td>
                </tr>
                )
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-gray-400 text-sm">
                    No tickets match the current filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Coming soon message */}
          <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground border-t border-gray-100">
            <Wrench className="h-10 w-10 mb-3 text-slate-300" />
            <p className="font-medium text-sm">Maintenance module coming soon</p>
            <p className="text-xs mt-1">Ticket assignment, resolution tracking, and full CRUD will appear here</p>
          </div>

          {filtered.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 text-[11px] text-gray-400 text-right">
              Showing {filtered.length} of {requests.length} tickets
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
