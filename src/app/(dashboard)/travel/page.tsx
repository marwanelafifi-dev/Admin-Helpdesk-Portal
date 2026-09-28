"use client"

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Search, Plus, Plane, Clock, CheckCircle2, ChevronUp, ChevronDown, ChevronsUpDown, MessageCircle, Download, FileSpreadsheet, Sheet } from "lucide-react"
import { exportToCSV, exportToGoogleSheets } from "@/lib/travelExport"
import { Card, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { getRequests, initializeMockData, updateStatus, getRequestById, getAllCcEmails, deleteRequestPermanently, isUserInCc, type EngineRequest, type RequestStatus } from "@/services/engineService"
import { createRequestUpdateNotifications } from "@/lib/notificationStore"
import { cn, fmtDate, fmtDateTime, normalizeSearchText, getSearchablePayloadText } from "@/lib/utils"
import { scopeRequestsByModuleAccess, type UserWithModuleAccess } from "@/lib/access"
import { useCommentCounts } from "@/hooks/useCommentCounts"
import { useViewedComments } from "@/hooks/useViewedComments"
import { useCommentSearch } from "@/hooks/useCommentSearch"
import { useExpandedRows } from "@/hooks/useExpandedRows"
import { InlineStatusSelect } from "@/components/ui/InlineStatusSelect"
import { RequestActionsMenu } from "@/components/ui/RequestActionsMenu"
import { useNewRequestsAndTasks } from "@/hooks/useNewRequestsAndTasks"
import { NewItemsAlert } from "@/components/ui/NewItemsAlert"
import { CompanyBadge } from "@/components/ui/CompanyBadge"
import { CcVisibilityToggle } from "@/components/ui/CcVisibilityToggle"
import { CompanyFilter, matchesCompanyFilter, type CompanyFilterValue } from "@/components/ui/CompanyFilter"
import { useCcVisibility } from "@/hooks/useCcVisibility"
import { LABEL_COLORS, LABEL_DOTS } from "@/lib/statusPalette"
import { OperationalStatusGrid } from "@/components/ui/OperationalPage"

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  new: "New", awaiting_approval: "Awaiting Approval", in_progress: "In Progress",
  completed: "Completed", cancelled: "Cancelled",
}

const STATUS_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(STATUS_LABELS).map(([code, label]) => [code, LABEL_COLORS[label] ?? "bg-zinc-100 text-zinc-600"])
)
const STATUS_DOT: Record<string, string> = Object.fromEntries(
  Object.entries(STATUS_LABELS).map(([code, label]) => [code, LABEL_DOTS[label] ?? "bg-gray-400"])
)

const STATUS_PILL_ACTIVE: Record<string, string> = {
  new: "bg-sky-500 border-sky-500 text-white",
  awaiting_approval: "bg-amber-500 border-amber-500 text-white",
  in_progress: "bg-blue-600 border-blue-600 text-white",
  completed: "bg-emerald-600 border-emerald-600 text-white",
  cancelled: "bg-red-600 border-red-600 text-white",
}

const STATUSES = ["new", "awaiting_approval", "in_progress", "completed", "cancelled"] as const

type SortKey = "id" | "title" | "createdAt" | "requesterName" | "status" | "updatedAt"

const COLS: { key: SortKey; label: string; defaultW: number }[] = [
  { key: "id",            label: "Request ID",      defaultW: 130 },
  { key: "title",         label: "Request Title",   defaultW: 200 },
  { key: "createdAt",     label: "Submission Date", defaultW: 140 },
  { key: "requesterName", label: "Requester Name",  defaultW: 160 },
]

// Type and Items are displayed but not sortable
const EXTRA_COLS = [
  { label: "Type",   width: 120 },
  { label: "Items",  width: 140 },
]

// Status and Last Update Date columns
const STATUS_COLS: { key: SortKey; label: string; defaultW: number }[] = [
  { key: "status",        label: "Status",          defaultW: 130 },
  { key: "updatedAt",     label: "Last Update Date",defaultW: 140 },
]


// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TravelPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { showCcRequests, toggleCcVisibility } = useCcVisibility()
  const [requests, setRequests]           = useState<EngineRequest[]>([])
  const [search, setSearch]               = useState("")
  const [statusFilter, setStatusFilter]   = useState("all")
  const [companyFilter, setCompanyFilter] = useState<CompanyFilterValue>("all")
  const [sortKey, setSortKey]             = useState<SortKey>("updatedAt")
  const [sortDir, setSortDir]             = useState<"asc" | "desc">("desc")
  const [colWidths, setColWidths]         = useState<(number | null)[]>(() => COLS.map(() => null))
  const [exportOpen, setExportOpen]       = useState(false)
  const exportRef                         = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLTableElement>(null)

  const canUpdateStatus = ((session?.user?.permissions as string[])?.includes("update_status") || (session?.user?.permissions as string[])?.includes("*")) ?? false
  const canEditRequest = ((session?.user?.permissions as string[])?.includes("edit_request") || (session?.user?.permissions as string[])?.includes("*")) ?? false
  const canCancelRequest = ((session?.user?.permissions as string[])?.includes("cancel_request") || (session?.user?.permissions as string[])?.includes("*")) ?? false
  const canPermanentDelete = (
    (session?.user?.permissions as string[])?.includes("*")
    || (session?.user?.permissions as string[])?.includes("delete")
  ) ?? false
  const readModules = (session?.user as UserWithModuleAccess | undefined)?.readModules
  const readAllModules = (session?.user as UserWithModuleAccess | undefined)?.readAllModules

  const { newRequestsCount, newTasksCount } = useNewRequestsAndTasks()

  useEffect(() => {
    if (!exportOpen) return
    const handler = (e: MouseEvent) => {
      if (!exportRef.current?.contains(e.target as Node)) setExportOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [exportOpen])

  useEffect(() => {
    initializeMockData()
    const sync = () => {
      let all = getRequests().filter((r) => r.module === "travel")

      // Apply module-level access control if user has restrictions
      const userWithModules: UserWithModuleAccess = {
        id: session?.user?.id,
        email: session?.user?.email,
        role: session?.user?.role as string,
        readModules,
        readAllModules,
      }
      setRequests(scopeRequestsByModuleAccess(all, userWithModules, session?.user))
    }
    sync()
    window.addEventListener("focus", sync)
    window.addEventListener("storage", sync)
    window.addEventListener("arp:storage", sync)
    return () => { window.removeEventListener("focus", sync); window.removeEventListener("storage", sync); window.removeEventListener("arp:storage", sync) }
  }, [session?.user?.id, session?.user?.email, session?.user?.role, readModules, readAllModules])

  function handleStatusChange(id: string, newStatus: string) {
    const request = requests.find(r => r.id === id)
    const currentUserId = session?.user?.id || "USR-001"
    const oldStatus = request?.status
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus as RequestStatus, updatedAt: new Date().toISOString() } : r))
    void updateStatus(id, newStatus as RequestStatus, currentUserId)
    if (request) {
      createRequestUpdateNotifications({
        requestId: id,
        requestTitle: request.title,
        module: "travel",
        requestOwnerId: request.requesterId,
        requestOwnerEmail: request.requesterEmail,
        actionUserId: currentUserId,
        actionUserName: session?.user?.name || "User",
        actionUserEmail: session?.user?.email || undefined,
        preview: `Status changed from ${oldStatus} to ${newStatus}`,
        previousStatus: oldStatus,
        newStatus,
        updateType: "status",
        ccEmails: getAllCcEmails(getRequestById(id) ?? { adminCc: [], payload: {} } as any),
      })
    }
  }

  function handleCancelRequest(id: string) {
    if (confirm("Are you sure you want to cancel this request?")) {
      handleStatusChange(id, "cancelled")
    }
  }

  const commentCounts = useCommentCounts(requests.map(r => r.id))
  const { viewedComments } = useViewedComments()
  const commentMatchIds = useCommentSearch(search)
  const { expandedRows, toggleRow, isExpanded } = useExpandedRows()

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

  const allVisibleRequests = useMemo(() => {
    if (!showCcRequests) return requests
    // When CC toggle is on, include requests where the user is CC'd but not the requester
    const userEmail = session?.user?.email ?? ""
    const userId = session?.user?.id ?? ""
    const allRequests = getRequests().filter((r) => r.module === "travel")
    const ccRequests = allRequests.filter((r) =>
      r.requesterId !== userId && // Not the requester
      !requests.some(req => req.id === r.id) && // Not already included
      isUserInCc(r, userEmail) // User is in CC
    )
    return [...requests, ...ccRequests]
  }, [requests, showCcRequests, session?.user?.email, session?.user?.id])

  const filtered = useMemo(() => {
    let result = allVisibleRequests
    result = result.filter((r) => matchesCompanyFilter(r, companyFilter))
    if (statusFilter !== "all") result = result.filter((r) => r.status === statusFilter)
    const q = normalizeSearchText(search)
    if (q) result = result.filter((r) =>
      normalizeSearchText(r.id).includes(q) ||
      normalizeSearchText(r.title).includes(q) ||
      normalizeSearchText(String((r.payload as Record<string, unknown>).destination ?? "")).includes(q) ||
      normalizeSearchText(getSearchablePayloadText(r)).includes(q) ||
      commentMatchIds.has(r.id)
    )
    return result.sort((a, b) => {
      let av: string, bv: string
      if (sortKey === "requesterName") {
        av = a.requesterName ?? ""
        bv = b.requesterName ?? ""
      } else {
        av = String(a[sortKey as keyof EngineRequest] ?? "")
        bv = String(b[sortKey as keyof EngineRequest] ?? "")
      }
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av)
    })
  }, [allVisibleRequests, statusFilter, companyFilter, search, sortKey, sortDir, commentMatchIds])

  const companyRequests = useMemo(() => requests.filter((r) => matchesCompanyFilter(r, companyFilter)), [requests, companyFilter])
  const counts = useMemo(() => ({
    total:             companyRequests.length,
    new:               companyRequests.filter((r) => r.status === "new").length,
    awaitingApproval:  companyRequests.filter((r) => r.status === "awaiting_approval").length,
    inProgress:        companyRequests.filter((r) => r.status === "in_progress").length,
    completed:         companyRequests.filter((r) => r.status === "completed").length,
    cancelled:         companyRequests.filter((r) => r.status === "cancelled").length,
  }), [companyRequests])

  const statCards = [
    { key: "all",               label: "Total Trips",        value: counts.total,             icon: Plane,        iconBg: "bg-teal-50",    iconColor: "text-teal-600",    activeBg: "bg-slate-800", activeBorder: "border-slate-800" },
    { key: "new",               label: "New",                value: counts.new,               icon: Clock,        iconBg: "bg-sky-50",     iconColor: "text-sky-600",     activeBg: "bg-sky-500",   activeBorder: "border-sky-500" },
    { key: "awaiting_approval", label: "Awaiting Approval",  value: counts.awaitingApproval,  icon: Clock,        iconBg: "bg-amber-50",   iconColor: "text-amber-600",   activeBg: "bg-amber-500", activeBorder: "border-amber-500" },
    { key: "in_progress",       label: "In Progress",        value: counts.inProgress,        icon: Clock,        iconBg: "bg-blue-50",    iconColor: "text-blue-600",    activeBg: "bg-blue-600",  activeBorder: "border-blue-600" },
    { key: "completed",         label: "Completed",          value: counts.completed,         icon: CheckCircle2,  iconBg: "bg-emerald-50", iconColor: "text-emerald-600", activeBg: "bg-emerald-600",activeBorder: "border-emerald-600" },
    { key: "cancelled",         label: "Cancelled",          value: counts.cancelled,         icon: Clock,         iconBg: "bg-red-50", iconColor: "text-red-600", activeBg: "bg-red-600", activeBorder: "border-red-600" },
  ] as const

  return (
    <div className="space-y-6">

      <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 dark:border-slate-700 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Administration operations · Travel</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Travel Requests</h1><p className="mt-1 text-sm text-muted-foreground">Review, prioritize, and coordinate business travel requests.</p></div>
        <div className="flex flex-wrap items-center gap-2">{(newRequestsCount > 0 || newTasksCount > 0) && <NewItemsAlert requestsCount={newRequestsCount} tasksCount={newTasksCount} variant="icon" />}<Button className="h-10 bg-blue-600 px-4 font-semibold text-white shadow-sm hover:bg-blue-700" onClick={() => router.push("/travel/new")}><Plus className="mr-2 h-4 w-4" />New Travel Request</Button></div>
      </div>

      {/* Stat Cards */}
      <OperationalStatusGrid
        items={statCards}
        activeKey={statusFilter}
        onSelect={(key) => setStatusFilter(key === "all" ? "all" : statusFilter === key ? "all" : key)}
      />

      {/* Table Card */}
      <Card className="overflow-hidden border-slate-200 shadow-sm dark:border-slate-700">
        <CardHeader className="space-y-0 border-b border-slate-200 bg-slate-50/70 px-5 py-4 dark:border-slate-700 dark:bg-slate-900/40 sm:px-6">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID, title, destination, or comments…"
                className="h-10 border-slate-300 bg-white pl-9 shadow-sm focus-visible:ring-blue-500 dark:border-slate-600 dark:bg-slate-950"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5 xl:justify-end">
              {(["all", ...STATUSES] as const).map((s) => {
                const activeClass = s === "all" ? "bg-slate-900 border-slate-900 text-white" : STATUS_PILL_ACTIVE[s]
                return (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s === "all" ? "all" : s)}
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

          <div className="mt-3 flex flex-col gap-3 border-t border-slate-200 pt-3 dark:border-slate-700 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <CompanyFilter value={companyFilter} onChange={setCompanyFilter} />
              <CcVisibilityToggle checked={showCcRequests} onCheckedChange={toggleCcVisibility} className="rounded-md border-slate-200 bg-white px-3 py-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-950" />
            </div>

          {/* CC Visibility Toggle + Export */}
          <div className="flex flex-wrap items-center justify-between gap-3 lg:justify-end">

            {/* Export Dropdown */}
            <div ref={exportRef} className="relative hidden" aria-hidden="true">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExportOpen((o) => !o)}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", exportOpen && "rotate-180")} />
              </Button>

              {exportOpen && (
                <div className="absolute right-0 mt-1 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden">
                  <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Export {filtered.length} Record{filtered.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="p-1">
                    <button
                      type="button"
                      onClick={() => {
                        exportToCSV(filtered, `travel-requests-${new Date().toISOString().split("T")[0]}.csv`)
                        setExportOpen(false)
                      }}
                      className="w-full flex items-start gap-3 px-3 py-2.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors"
                    >
                      <div className="h-8 w-8 rounded-md bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <FileSpreadsheet className="h-4 w-4 text-green-700 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Export as CSV</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Opens in Excel or any spreadsheet app</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        exportToGoogleSheets(filtered)
                        setExportOpen(false)
                      }}
                      className="w-full flex items-start gap-3 px-3 py-2.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors"
                    >
                      <div className="h-8 w-8 rounded-md bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Sheet className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Open in Google Sheets</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Data copied to clipboard — paste in Sheets</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
            <p className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300"><span className="h-2 w-2 rounded-full bg-blue-500" />{filtered.length} trip{filtered.length !== 1 ? "s" : ""} shown</p>
            <div data-request-export-slot className="shrink-0" />
          </div>
          </div>
        </CardHeader>

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
                {EXTRA_COLS.map((col) => (
                  <th
                    key={col.label}
                    className="py-3 text-xs font-semibold text-slate-300 tracking-wide text-left select-none"
                    style={{ paddingLeft: 12, paddingRight: 8, width: col.width }}
                  >
                    {col.label}
                  </th>
                ))}
                {STATUS_COLS.map((col, idx) => (
                  <th
                    key={col.key}
                    className="relative py-3 text-xs font-semibold text-slate-300 tracking-wide text-left select-none group"
                    style={{ paddingLeft: 12, paddingRight: 8 }}
                  >
                    <button onClick={() => handleSort(col.key)} className="inline-flex items-center gap-0.5 hover:text-white transition-colors w-full">
                      {col.label}
                      <SortIcon col={col.key} />
                    </button>
                    <span
                      onMouseDown={(e) => onResizeMouseDown(e, COLS.length + idx)}
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
                <React.Fragment key={req.id}>
                <tr className={cn("border-b border-gray-100 hover:bg-blue-50/30 transition-colors", hasUnreadComments ? "bg-blue-50" : (i % 2 === 0 ? "bg-white" : "bg-gray-50/40"))}>
                  <td className="py-3 overflow-hidden" style={{ paddingLeft: 20, paddingRight: 8 }}>
                    <div className="flex items-center gap-2">
                      <Link href={`/requests/${req.id}?source=travel`} className="text-sm font-medium text-blue-600 truncate block hover:underline">
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
                  <td className="py-3 px-3 overflow-hidden">
                    <span className="text-sm font-medium text-gray-700 truncate block">{fmtDateTime(req.createdAt)}</span>
                  </td>
                  <td className="py-3 px-3 overflow-hidden">
                    <span className="text-sm font-medium text-gray-700 truncate block">{req.requesterName}</span>
                    <CompanyBadge className="mt-1" module={req.module} requesterEmail={req.requesterEmail} companyId={req.companyId} companyName={req.companyName} />
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-sm font-medium text-gray-700">
                      {(req.payload as Record<string, unknown>).travelType === "visa_application" ? "Visa" : "Hotel & Flight"}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-sm font-medium text-gray-700">
                      {Array.isArray((req.payload as Record<string, unknown>).items)
                        ? ((req.payload as Record<string, unknown>).items as string[]).join(", ")
                        : "—"}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <InlineStatusSelect
                      requestId={req.id}
                      currentStatus={req.status}
                      statuses={STATUSES}
                      statusColors={STATUS_COLORS}
                      statusDot={STATUS_DOT}
                      statusLabels={STATUS_LABELS}
                      onStatusChange={(newStatus) => handleStatusChange(req.id, newStatus)}
                      canUpdateStatus={canUpdateStatus}
                    />
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-sm font-medium text-gray-700">{fmtDateTime(req.updatedAt)}</span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <RequestActionsMenu
                      requestId={req.id}
                      showCancelOption={canCancelRequest}
                      showDeleteOption={canPermanentDelete}
                      isExpanded={isExpanded(req.id)}
                      onViewDetails={() => toggleRow(req.id)}
                      onEdit={canEditRequest ? (id) => window.open(`/requests/${id}?source=travel`, '_blank') : undefined}
                      onDelete={(id) => {
                        if (!confirm(`Permanently delete ${id}? This cannot be undone.`)) return
                        deleteRequestPermanently(id)
                        setRequests((prev) => prev.filter((r) => r.id !== id))
                      }}
                      onCancel={handleCancelRequest}
                    />
                  </td>
                </tr>
                {isExpanded(req.id) && (
                  <tr className="bg-blue-50">
                    <td colSpan={COLS.length + EXTRA_COLS.length + 1} className="py-4 px-6">
                      <div className="space-y-3 text-sm">
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <p className="font-semibold text-gray-700">Title</p>
                            <p className="text-gray-600">{req.title}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-700">Destination</p>
                            <p className="text-gray-600">{String((req.payload as Record<string, unknown>).destination ?? "—")}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-700">Travel Date</p>
                            <p className="text-gray-600">{(req.payload as Record<string, unknown>).startDate ? fmtDate(String((req.payload as Record<string, unknown>).startDate)) : "—"}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-700">Status</p>
                            <p className="text-gray-600">{STATUS_LABELS[req.status] || req.status}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-700">Requester</p>
                            <p className="text-gray-600">{req.requesterName}</p>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              )
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={COLS.length + EXTRA_COLS.length + 1} className="py-16 text-center text-gray-400 text-sm">
                    No trips match the current filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {filtered.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 text-[11px] text-gray-400 text-right">
              Showing {filtered.length} of {companyRequests.length} trips
            </div>
          )}
            </div>
          </div>
      </Card>
    </div>
  )
}

