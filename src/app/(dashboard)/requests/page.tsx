"use client"

import { useEffect, useMemo, useRef, useCallback, useState } from "react"
import Link from "next/link"
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, MessageCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardHeader } from "@/components/ui/card"
import { getRequests, initializeMockData, type EngineRequest } from "@/services/engineService"
import { cn } from "@/lib/utils"
import { requestsAPI, commentsAPI } from "@/lib/apiClient"

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft", new: "New", on_hold: "In Progress", in_transit: "In Customs",
  delivered: "Delivered", completed: "Completed", cancelled: "Cancelled",
  "New": "New", "In Progress": "In Progress", "In Customs": "In Customs", "In Transit": "In Customs",
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-600", new: "bg-sky-50 text-sky-700",
  on_hold: "bg-amber-50 text-amber-700", in_transit: "bg-blue-50 text-blue-700",
  delivered: "bg-green-50 text-green-700", completed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-600",
  "New": "bg-sky-50 text-sky-700", "In Progress": "bg-blue-50 text-blue-700", "In Customs": "bg-amber-50 text-amber-700", "In Transit": "bg-blue-50 text-blue-700",
}

const STATUS_DOT: Record<string, string> = {
  draft: "bg-zinc-400", new: "bg-sky-500", on_hold: "bg-amber-500",
  in_transit: "bg-blue-500", delivered: "bg-green-500",
  completed: "bg-emerald-500", cancelled: "bg-red-500",
  "New": "bg-sky-500", "In Progress": "bg-blue-500", "In Customs": "bg-amber-500", "In Transit": "bg-blue-500",
}

const STATUS_PILL_ACTIVE: Record<string, string> = {
  draft: "bg-zinc-500 border-zinc-500 text-white",
  new: "bg-sky-500 border-sky-500 text-white",
  on_hold: "bg-amber-500 border-amber-500 text-white",
  in_transit: "bg-blue-600 border-blue-600 text-white",
  delivered: "bg-green-600 border-green-600 text-white",
  completed: "bg-emerald-600 border-emerald-600 text-white",
  cancelled: "bg-red-600 border-red-600 text-white",
  "New": "bg-sky-500 border-sky-500 text-white", "In Progress": "bg-blue-600 border-blue-600 text-white", "In Customs": "bg-amber-600 border-amber-600 text-white", "In Transit": "bg-blue-600 border-blue-600 text-white",
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

const MODULE_PILL_ACTIVE: Record<string, string> = {
  shipping: "bg-blue-600 border-blue-600 text-white",
  maintenance: "bg-purple-600 border-purple-600 text-white",
  purchase: "bg-green-600 border-green-600 text-white",
  event: "bg-orange-500 border-orange-500 text-white",
  travel: "bg-pink-500 border-pink-500 text-white",
  hr: "bg-teal-600 border-teal-600 text-white",
}

const STATUSES = ["draft", "new", "on_hold", "in_transit", "delivered", "completed", "cancelled"] as const
const MODULES  = ["shipping", "maintenance", "purchase", "event", "travel", "hr"] as const

const STAT_CARDS = [
  { key: "total",      label: "Total",      accentBg: "bg-slate-800",   accentBorder: "border-slate-800" },
  { key: "draft",      label: "Draft",      accentBg: "bg-zinc-500",    accentBorder: "border-zinc-500" },
  { key: "new",        label: "New",        accentBg: "bg-sky-500",     accentBorder: "border-sky-500" },
  { key: "on_hold",    label: "In Progress", accentBg: "bg-amber-500",   accentBorder: "border-amber-500" },
  { key: "in_transit", label: "In Customs",  accentBg: "bg-blue-600",    accentBorder: "border-blue-600" },
  { key: "delivered",  label: "Delivered",  accentBg: "bg-green-600",   accentBorder: "border-green-600" },
  { key: "completed",  label: "Completed",  accentBg: "bg-emerald-600", accentBorder: "border-emerald-600" },
  { key: "cancelled",  label: "Cancelled",  accentBg: "bg-red-600",     accentBorder: "border-red-600" },
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
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

const CURRENT_USER_ID = "USR-001"

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RequestsPage() {
  const [requests, setRequests]           = useState<EngineRequest[]>([])
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({})
  const [search, setSearch]               = useState("")
  const [statusFilter, setStatusFilter]   = useState("all")
  const [moduleFilter, setModuleFilter]   = useState("all")
  const [sortKey, setSortKey]             = useState<SortKey>("updatedAt")
  const [sortDir, setSortDir]             = useState<"asc" | "desc">("desc")
  const [colWidths, setColWidths]         = useState<number[]>(() => COLS.map((c) => c.defaultW))
  const resizingCol  = useRef<number | null>(null)
  const resizeStartX = useRef(0)
  const resizeStartW = useRef(0)

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        initializeMockData()
        const allRequests = getRequests()
        setRequests(allRequests)

        // Fetch comment counts for all requests
        const counts: Record<string, number> = {}
        for (const req of allRequests) {
          try {
            const commentsData = await commentsAPI.list(req.id)
            counts[req.id] = (commentsData.data || []).length
          } catch (err) {
            counts[req.id] = 0
          }
        }
        setCommentCounts(counts)
      } catch (error) {
        console.error("Failed to fetch requests:", error)
        initializeMockData()
        setRequests(getRequests())
      }
    }

    fetchRequests()
  }, [])

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

  const userRequests = useMemo(() => requests.filter((r) => r.requesterId === CURRENT_USER_ID), [requests])

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
    total:      userRequests.length,
    draft:      userRequests.filter((r) => r.status === "draft").length,
    new:        userRequests.filter((r) => r.status === "new").length,
    on_hold:    userRequests.filter((r) => r.status === "on_hold").length,
    in_transit: userRequests.filter((r) => r.status === "in_transit").length,
    delivered:  userRequests.filter((r) => r.status === "delivered").length,
    completed:  userRequests.filter((r) => r.status === "completed").length,
    cancelled:  userRequests.filter((r) => r.status === "cancelled").length,
  }), [userRequests])

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Requests</h1>
          <p className="text-muted-foreground text-sm mt-0.5">View all your requests across all modules</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 lg:grid-cols-8 gap-3">
        {STAT_CARDS.map(({ key, label, accentBg, accentBorder }) => {
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
                  : "bg-white border-gray-100 hover:border-gray-200"
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
              {filtered.map((req, i) => (
                <tr key={req.id} className={cn("border-b border-gray-100 hover:bg-blue-50/30 transition-colors", i % 2 === 0 ? "bg-white" : "bg-gray-50/40")}>
                  <td className="py-3 overflow-hidden" style={{ paddingLeft: 20, paddingRight: 8 }}>
                    <div className="flex items-center gap-2">
                      <Link href={`/requests/${req.id}`} className="text-sm font-medium text-blue-600 truncate hover:underline">
                        {req.id}
                      </Link>
                      {(commentCounts[req.id] ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-1 flex-shrink-0 text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
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
                  <td className="py-3 px-3">
                    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", MODULE_COLORS[req.module] ?? "text-gray-600")}>
                      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", MODULE_DOT[req.module] ?? "bg-gray-400")} />
                      {formatModule(req.module)}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap", STATUS_COLORS[req.status] ?? "bg-zinc-100 text-zinc-600")}>
                      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", STATUS_DOT[req.status] ?? "bg-gray-400")} />
                      {STATUS_LABELS[req.status] ?? req.status}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-sm font-medium text-gray-700 whitespace-nowrap">{formatDate(req.updatedAt)}</span>
                  </td>
                </tr>
              ))}
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
      </Card>
    </div>
  )
}
