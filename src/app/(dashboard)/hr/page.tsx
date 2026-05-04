"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { Search, Users, UserPlus, UserMinus, Plus, ChevronUp, ChevronDown, ChevronsUpDown, MessageCircle } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getRequests, initializeMockData, updateStatus, type EngineRequest, type RequestStatus } from "@/services/engineService"
import { notifyStatusChange } from "@/services/notificationService"
import type { HRPayload } from "@/modules/hr/hr.schema"
import { cn } from "@/lib/utils"
import { requestsAPI } from "@/lib/apiClient"
import { useCommentCounts } from "@/hooks/useCommentCounts"
import { useViewedComments } from "@/hooks/useViewedComments"
import { useExpandedRows } from "@/hooks/useExpandedRows"
import { InlineStatusSelect } from "@/components/ui/InlineStatusSelect"
import { RequestActionsMenu } from "@/components/ui/RequestActionsMenu"

// ─── Constants ────────────────────────────────────────────────────────────────

const HR_STATUSES = ["new", "on_hold", "completed"] as const

const STATUS_LABELS: Record<string, string> = {
  new: "New", on_hold: "In Progress", completed: "Completed",
}

const STATUS_COLORS: Record<string, string> = {
  new:       "bg-sky-50 text-sky-700",
  on_hold:   "bg-amber-50 text-amber-700",
  completed: "bg-emerald-50 text-emerald-700",
}

const STATUS_DOT: Record<string, string> = {
  new: "bg-sky-500", on_hold: "bg-amber-500", completed: "bg-emerald-500",
}

const STATUS_PILL_ACTIVE: Record<string, string> = {
  new:       "bg-sky-500 border-sky-500 text-white",
  on_hold:   "bg-amber-500 border-amber-500 text-white",
  completed: "bg-emerald-600 border-emerald-600 text-white",
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

type Tab = "all" | "onboarding" | "offboarding"
type SortKey = "id" | "title" | "employeeId" | "employeeName" | "department" | "sector" | "directManager" | "hrType" | "status" | "date"
type SortDir = "asc" | "desc"

const COLS: { key: SortKey; label: string; defaultW: number }[] = [
  { key: "id",           label: "Request ID",    defaultW: 120 },
  { key: "title",        label: "Request Title", defaultW: 160 },
  { key: "employeeId",   label: "Employee ID",   defaultW: 130 },
  { key: "employeeName", label: "Employee Name", defaultW: 180 },
  { key: "sector",       label: "Sector",        defaultW: 130 },
  { key: "department",   label: "Department",    defaultW: 140 },
  { key: "directManager", label: "Direct Manager", defaultW: 150 },
  { key: "hrType",       label: "Type",          defaultW: 110 },
  { key: "status",       label: "Status",        defaultW: 120 },
  { key: "date",         label: "Last Update Date", defaultW: 140 },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HRPage() {
  const { data: session } = useSession()
  const [requests, setRequests]         = useState<EngineRequest[]>([])
  const [search, setSearch]             = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [activeTab, setActiveTab]       = useState<Tab>("all")
  const [sortKey, setSortKey]           = useState<SortKey>("id")
  const [sortDir, setSortDir]           = useState<SortDir>("asc")
  const [colWidths, setColWidths]       = useState<(number | null)[]>(() => COLS.map(() => null))
  const tableRef = useRef<HTMLTableElement>(null)

  const canUpdateStatus = ((session?.user?.permissions as string[])?.includes("update_status") || (session?.user?.permissions as string[])?.includes("*")) ?? false
  const canCancelRequest = ((session?.user?.permissions as string[])?.includes("cancel_request") || (session?.user?.permissions as string[])?.includes("*")) ?? false
  const canEditRequest = ((session?.user?.permissions as string[])?.includes("edit_request") || (session?.user?.permissions as string[])?.includes("*")) ?? false

  const commentCounts = useCommentCounts(requests.map(r => r.id))
  const { viewedComments } = useViewedComments()
  const { expandedRows, toggleRow, isExpanded } = useExpandedRows()

  useEffect(() => {
    initializeMockData()
    setRequests(getRequests().filter((r) => r.module === "hr"))
  }, [])

  function handleStatusChange(id: string, newStatus: string) {
    const request = requests.find(r => r.id === id)
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus as RequestStatus, updatedAt: new Date().toISOString() } : r))
    updateStatus(id, newStatus as RequestStatus, "USR-001")

    // Notify relevant users about status change
    if (request) {
      notifyStatusChange("USR-001", id, request.title, "hr", newStatus)
    }
  }

  function handleCancelRequest(id: string) {
    if (confirm("Are you sure you want to cancel this request?")) {
      handleStatusChange(id, "completed")
    }
  }

  // ── Resize ────────────────────────────────────────────────────────────────
  function onResizeMouseDown(e: React.MouseEvent, idx: number) {
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
  }

  // ── Sort ──────────────────────────────────────────────────────────────────
  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("asc") }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronsUpDown className="h-3 w-3 ml-1 opacity-40 shrink-0" />
    return sortDir === "asc" ? <ChevronUp className="h-3 w-3 ml-1 shrink-0" /> : <ChevronDown className="h-3 w-3 ml-1 shrink-0" />
  }

  const hrRequests = useMemo(() => requests.filter((r) => r.module === "hr"), [requests])

  const filtered = useMemo(() => {
    let result = hrRequests
    if (activeTab !== "all") result = result.filter((r) => (r.payload as HRPayload).hrType === activeTab)
    if (statusFilter !== "all") result = result.filter((r) => r.status === statusFilter)
    const q = search.trim().toLowerCase()
    if (q) result = result.filter((r) => {
      const p = r.payload as HRPayload
      return r.id.toLowerCase().includes(q) || r.title.toLowerCase().includes(q) ||
        p.employeeName.toLowerCase().includes(q) || p.employeeId.toLowerCase().includes(q) ||
        p.department.toLowerCase().includes(q)
    })
    return result.sort((a, b) => {
      const pa = a.payload as HRPayload, pb = b.payload as HRPayload
      const getVal = (r: EngineRequest, p: HRPayload) => {
        if (sortKey === "id")           return r.id
        if (sortKey === "title")        return r.title
        if (sortKey === "hrType")       return p.hrType
        if (sortKey === "employeeName") return p.employeeName
        if (sortKey === "employeeId")   return p.employeeId
        if (sortKey === "sector")       return p.sector || ""
        if (sortKey === "department")   return p.department
        if (sortKey === "directManager") return p.directManager || ""
        if (sortKey === "date")         return p.hrType === "onboarding" ? p.startDate : p.lastWorkingDay
        if (sortKey === "status")       return r.status
        return ""
      }
      const av = getVal(a, pa), bv = getVal(b, pb)
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av)
    })
  }, [hrRequests, activeTab, statusFilter, search, sortKey, sortDir])

  const stats = useMemo(() => ({
    total:       hrRequests.length,
    onboarding:  hrRequests.filter((r) => (r.payload as HRPayload).hrType === "onboarding").length,
    offboarding: hrRequests.filter((r) => (r.payload as HRPayload).hrType === "offboarding").length,
    completed:   hrRequests.filter((r) => r.status === "completed").length,
  }), [hrRequests])

  const tabCount = (tab: Tab) =>
    tab === "all" ? hrRequests.length : hrRequests.filter((r) => (r.payload as HRPayload).hrType === tab).length

  const tabs: { key: Tab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "onboarding", label: "Onboarding" },
    { key: "offboarding", label: "Offboarding" },
  ]

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">HR Requests</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Manage onboarding and offboarding requests for the administration team
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Add HR Request
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href="/hr/new?type=onboarding" className="flex items-center gap-2 cursor-pointer">
                <UserPlus className="h-4 w-4 text-teal-600" />
                Onboarding Request
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/hr/new?type=offboarding" className="flex items-center gap-2 cursor-pointer">
                <UserMinus className="h-4 w-4 text-red-600" />
                Offboarding Request
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stat Cards — clickable */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {([
          { key: "all",         label: "Total Requests", value: stats.total,       icon: Users,    iconBg: "bg-slate-100", iconColor: "text-slate-600", activeBg: "bg-slate-800",  activeBorder: "border-slate-800" },
          { key: "onboarding",  label: "Onboarding",     value: stats.onboarding,  icon: UserPlus, iconBg: "bg-blue-50",   iconColor: "text-blue-600",  activeBg: "bg-blue-600",   activeBorder: "border-blue-600" },
          { key: "offboarding", label: "Offboarding",    value: stats.offboarding, icon: UserMinus,iconBg: "bg-red-50",    iconColor: "text-red-600",   activeBg: "bg-red-600",    activeBorder: "border-red-600" },
        ] as const).map(({ key, label, value, icon: Icon, iconBg, iconColor, activeBg, activeBorder }) => {
          const isTabActive  = key === "onboarding" || key === "offboarding"
          const isStatActive = isTabActive
            ? activeTab === key
            : key === "all" ? (activeTab === "all" && statusFilter === "all") : statusFilter === key
          return (
            <button
              key={key}
              onClick={() => {
                if (key === "onboarding" || key === "offboarding") {
                  setActiveTab((p) => p === key ? "all" : key)
                } else {
                  setActiveTab("all"); setStatusFilter("all")
                }
              }}
              className={cn(
                "text-left rounded-xl border-2 p-5 flex items-center gap-4 transition-all hover:shadow-md",
                isStatActive ? `${activeBg} ${activeBorder} text-white shadow-sm` : "bg-white border-gray-100 hover:border-gray-200"
              )}
            >
              <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all", isStatActive ? "bg-white/20" : iconBg)}>
                <Icon className={cn("h-6 w-6 transition-all", isStatActive ? "text-white" : iconColor)} />
              </div>
              <div>
                <p className={cn("text-sm font-medium", isStatActive ? "text-white/80" : "text-muted-foreground")}>{label}</p>
                <p className={cn("text-2xl font-bold", isStatActive ? "text-white" : "")}>{value}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Table Card */}
      <Card>
        <CardHeader className="pb-4">

          {/* Tabs */}
          <div className="flex gap-1 border-b pb-3">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition whitespace-nowrap ${
                  activeTab === tab.key ? "bg-slate-900 text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {tab.label}
                <span className={`ml-2 text-xs font-normal ${activeTab === tab.key ? "text-gray-300" : "text-gray-400"}`}>
                  ({tabCount(tab.key)})
                </span>
              </button>
            ))}
          </div>

          {/* Search + Status pills */}
          <div className="flex flex-wrap gap-3 mt-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID, employee name, ID, or department..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-1.5 items-center">
              {(["all", "new", "on_hold", "completed"] as const).map((s) => {
                const activeClass = s === "all"
                  ? "bg-slate-900 border-slate-900 text-white"
                  : STATUS_PILL_ACTIVE[s]
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
                    {s === "all" ? "All Statuses" : STATUS_LABELS[s]}
                  </button>
                )
              })}
            </div>
          </div>

          <p className="text-sm text-muted-foreground font-normal mt-1">
            Showing {filtered.length} request{filtered.length !== 1 ? "s" : ""}
          </p>
        </CardHeader>

        {/* Table */}
        <div className="-mx-6 px-6 -mb-6">
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
                    <button
                      onClick={() => handleSort(col.key)}
                      className="inline-flex items-center gap-0.5 hover:text-white transition-colors w-full"
                    >
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
                const p = req.payload as HRPayload
                const date = p.hrType === "onboarding" ? p.startDate : p.lastWorkingDay
                const hasUnreadComments = (commentCounts[req.id] ?? 0) > (viewedComments[req.id] ?? 0)
                return (
                  <React.Fragment key={req.id}>
                  <tr
                    className={cn(
                      "border-b border-gray-100 hover:bg-blue-50/30 transition-colors",
                      hasUnreadComments ? "bg-blue-50" : (i % 2 === 0 ? "bg-white" : "bg-gray-50/40")
                    )}
                  >
                    <td className="py-3 overflow-hidden" style={{ paddingLeft: 20, paddingRight: 8 }}>
                      <div className="flex items-center gap-2">
                        <Link href={`/requests/${req.id}?source=hr`} className="text-sm font-medium text-blue-600 truncate hover:underline">
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
                    <td className="py-3 px-3">
                      <span className="text-sm font-medium text-gray-700">{p.employeeId}</span>
                    </td>
                    <td className="py-3 px-3 overflow-hidden">
                      <span className="text-sm font-medium text-gray-700 truncate block">{p.employeeName}</span>
                    </td>
                    <td className="py-3 px-3 overflow-hidden">
                      <span className="text-sm font-medium text-gray-700 truncate block">{p.sector || "—"}</span>
                    </td>
                    <td className="py-3 px-3 overflow-hidden">
                      <span className="text-sm font-medium text-gray-700 truncate block">{p.department}</span>
                    </td>
                    <td className="py-3 px-3 overflow-hidden">
                      <span className="text-sm font-medium text-gray-700 truncate block">{p.directManager || "—"}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                        p.hrType === "onboarding"
                          ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                          : "bg-red-50 text-red-700 ring-1 ring-red-200"
                      )}>
                        {p.hrType === "onboarding" ? "Onboarding" : "Offboarding"}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <InlineStatusSelect
                        currentStatus={req.status}
                        statuses={HR_STATUSES}
                        statusColors={STATUS_COLORS}
                        statusDot={STATUS_DOT}
                        statusLabels={STATUS_LABELS}
                        onStatusChange={(newStatus) => handleStatusChange(req.id, newStatus)}
                        canUpdateStatus={canUpdateStatus}
                      />
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-sm font-medium text-gray-700 whitespace-nowrap">{formatDate(req.updatedAt)}</span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <RequestActionsMenu
                        requestId={req.id}
                        showCancelOption={canCancelRequest}
                        isExpanded={isExpanded(req.id)}
                        onViewDetails={() => toggleRow(req.id)}
                        onEdit={canEditRequest ? (id) => window.open(`/requests/${id}?source=hr`, '_blank') : undefined}
                        onCancel={handleCancelRequest}
                      />
                    </td>
                  </tr>
                  {isExpanded(req.id) && (
                    <tr className="bg-blue-50">
                      <td colSpan={11} className="py-4 px-6">
                        <div className="space-y-5 text-sm">
                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <p className="font-semibold text-gray-700">Employee Name</p>
                              <p className="text-gray-600">{p.employeeName}</p>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-700">Employee ID</p>
                              <p className="text-gray-600">{p.employeeId}</p>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-700">Department</p>
                              <p className="text-gray-600">{p.department}</p>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-700">Sector</p>
                              <p className="text-gray-600">{p.sector || "—"}</p>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-700">Type</p>
                              <p className="text-gray-600">{p.hrType === "onboarding" ? "Onboarding" : "Offboarding"}</p>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-700">Status</p>
                              <p className="text-gray-600">{STATUS_LABELS[req.status] || req.status}</p>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-700">Job Title</p>
                              <p className="text-gray-600">{p.jobTitle || "—"}</p>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-700">Direct Manager</p>
                              <p className="text-gray-600">{p.directManager || "—"}</p>
                            </div>
                          </div>

                          {/* Items Section */}
                          <div className="border-t pt-4">
                            <p className="font-semibold text-gray-700 mb-3">
                              {p.hrType === "onboarding" ? "Onboarding Items" : "Offboarding Items"}
                            </p>
                            <div className="space-y-2">
                              {p.items && p.items.length > 0 ? (
                                p.items.map((item, idx) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={true}
                                      disabled
                                      className="w-4 h-4 rounded border-gray-300 text-blue-600"
                                    />
                                    <span className="text-gray-600">{item}</span>
                                  </div>
                                ))
                              ) : (
                                <p className="text-gray-500">No items selected</p>
                              )}
                            </div>
                          </div>

                          {p.notes && (
                            <div className="border-t pt-4">
                              <p className="font-semibold text-gray-700">Notes</p>
                              <p className="text-gray-600">{p.notes}</p>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                  </>
                )
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="text-center text-gray-400 text-sm py-16">
                    No HR requests match the current filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {filtered.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 text-[11px] text-gray-400 text-right">
              Showing {filtered.length} of {hrRequests.length} requests
            </div>
          )}
            </div>
          </div>
      </Card>
    </div>
  )
}
