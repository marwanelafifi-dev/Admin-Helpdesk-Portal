"use client"

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Search, Layers, TrendingUp, Clock, CheckCircle2, ChevronUp, ChevronDown, ChevronsUpDown, MessageCircle, CheckSquare, ArrowRight, Download, FileSpreadsheet, ChevronDown as ChevronDownIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { getRequests, initializeMockData, updateStatus, getRequestById, getAllCcEmails, assignRequest, deleteRequestPermanently, type EngineRequest, type RequestStatus } from "@/services/engineService"
import { createRequestUpdateNotifications, createAssignmentNotifications } from "@/lib/notificationStore"
import { AssigneeSelect } from "@/components/ui/AssigneeSelect"
import { getTasks, updateTaskStatus, type Task, type TaskStatus } from "@/services/taskService"
import { useNewRequestsAndTasks } from "@/hooks/useNewRequestsAndTasks"
import { NewItemsAlert } from "@/components/ui/NewItemsAlert"
import { cn, fmtDate, fmtDateTime } from "@/lib/utils"
import { animationClasses } from "@/lib/animations"
import { useCommentCounts } from "@/hooks/useCommentCounts"
import { useViewedComments } from "@/hooks/useViewedComments"
import { useExpandedRows } from "@/hooks/useExpandedRows"
import { InlineStatusSelect } from "@/components/ui/InlineStatusSelect"
import { RequestActionsMenu } from "@/components/ui/RequestActionsMenu"
import { LABEL_COLORS, LABEL_DOTS, buildLabelDrivenMaps } from "@/lib/statusPalette"

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  new: "New", on_hold: "In Progress", in_progress: "In Progress",
  in_customs: "In Customs", awaiting_approval: "Awaiting Approval",
  "In Progress": "In Progress", "In Customs": "In Customs",
  delivered: "Delivered", completed: "Completed", cancelled: "Cancelled",
}

// Color resolution uses the shared label-driven palette in lib/statusPalette
// so every list page renders the same status label in the same color.

// Kept for back-compat with callers that still pass STATUS_COLORS/STATUS_DOT.
const STATUS_COLORS: Record<string, string> = {
  new:               LABEL_COLORS["New"],
  on_hold:           LABEL_COLORS["In Progress"],
  in_progress:       LABEL_COLORS["In Progress"],
  in_customs:        LABEL_COLORS["In Customs"],
  awaiting_approval: LABEL_COLORS["Awaiting Approval"],
  delivered:         LABEL_COLORS["Delivered"],
  completed:         LABEL_COLORS["Completed"],
  cancelled:         LABEL_COLORS["Cancelled"],
}

const STATUS_DOT: Record<string, string> = {
  new:               LABEL_DOTS["New"],
  on_hold:           LABEL_DOTS["In Progress"],
  in_progress:       LABEL_DOTS["In Progress"],
  in_customs:        LABEL_DOTS["In Customs"],
  awaiting_approval: LABEL_DOTS["Awaiting Approval"],
  delivered:         LABEL_DOTS["Delivered"],
  completed:         LABEL_DOTS["Completed"],
  cancelled:         LABEL_DOTS["Cancelled"],
}

const MODULE_COLORS: Record<string, string> = {
  shipping: "text-blue-700", maintenance: "text-purple-700",
  purchase: "text-green-700", event: "text-orange-600",
  travel: "text-pink-600", hr: "text-teal-700",
}

const MODULE_DOT: Record<string, string> = {
  shipping: "bg-blue-500", maintenance: "bg-purple-500",
  purchase: "bg-green-500", event: "bg-orange-500",
  travel: "bg-pink-500", hr: "bg-teal-500", general: "bg-indigo-500",
}

const MODULES  = ["shipping", "maintenance", "purchase", "event", "travel", "hr", "general"] as const
const STATUSES = ["new", "in_progress", "in_customs", "awaiting_approval", "delivered", "completed", "cancelled"] as const

// Module-specific statuses — canonical code per UI label.
// Each code maps 1:1 to exactly one UI label (see MODULE_STATUS_LABELS).
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
  shipping: {
    new: "New", in_progress: "In Progress", in_customs: "In Customs", delivered: "Delivered", cancelled: "Cancelled",
  },
  purchase: {
    new: "New", in_progress: "In Progress", awaiting_approval: "Awaiting Approval", delivered: "Delivered", cancelled: "Cancelled",
  },
  maintenance: {
    new: "New", in_progress: "In Progress", completed: "Completed", cancelled: "Cancelled",
  },
  event: {
    new: "New", in_progress: "In Progress", delivered: "Delivered", completed: "Completed", cancelled: "Cancelled",
  },
  travel: {
    new: "New", in_progress: "In Progress", delivered: "Delivered", completed: "Completed", cancelled: "Cancelled",
  },
  hr: {
    new: "New", in_progress: "In Progress", completed: "Completed",
  },
  general: {
    new: "New", in_progress: "In Progress", completed: "Completed", cancelled: "Cancelled",
  },
}

function getStatusLabel(status: string, module: string): string {
  return MODULE_STATUS_LABELS[module]?.[status] ?? STATUS_LABELS[status] ?? status
}

function formatModule(m: string) { return m.charAt(0).toUpperCase() + m.slice(1) }

// ─── Page ─────────────────────────────────────────────────────────────────────

type ModuleTab = "all" | typeof MODULES[number]
type SortKey = "id" | "title" | "requesterName" | "createdAt" | "module" | "status" | "assignedToName" | "updatedAt"
type SortDir = "asc" | "desc"

const TASK_STATUS_COLORS: Record<TaskStatus, { bg: string; text: string }> = {
  todo: { bg: "bg-slate-50", text: "text-slate-700" },
  in_progress: { bg: "bg-blue-50", text: "text-blue-700" },
  in_review: { bg: "bg-amber-50", text: "text-amber-700" },
  completed: { bg: "bg-emerald-50", text: "text-emerald-700" },
  cancelled: { bg: "bg-red-50", text: "text-red-700" },
}

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  completed: "Completed",
  cancelled: "Cancelled",
}

export default function AllRequestsPage() {
  const { data: session } = useSession()
  const [requests, setRequests]         = useState<EngineRequest[]>([])
  const [tasks, setTasks]               = useState<Task[]>([])
  const [search, setSearch]             = useState("")
  const [activeTab, setActiveTab]       = useState<ModuleTab>("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortKey, setSortKey]           = useState<SortKey>("updatedAt")
  const [sortDir, setSortDir]           = useState<SortDir>("desc")
  const { isExpanded, toggleRow } = useExpandedRows()
  const { newRequestsCount, newTasksCount } = useNewRequestsAndTasks()

  const canUpdateStatus = ((session?.user?.permissions as string[])?.includes("update_status") || (session?.user?.permissions as string[])?.includes("*")) ?? false
  const canEditRequest = ((session?.user?.permissions as string[])?.includes("edit_request") || (session?.user?.permissions as string[])?.includes("*")) ?? false
  const canCancelRequest = ((session?.user?.permissions as string[])?.includes("cancel_request") || (session?.user?.permissions as string[])?.includes("*")) ?? false
  const canAssign = ((session?.user?.permissions as string[])?.includes("assign_requests") || (session?.user?.permissions as string[])?.includes("*")) ?? false
  // Permanent-delete is admin-only. We gate the menu item here too so it
  // doesn't appear to non-admins, mirroring the server's DELETE auth check.
  const canPermanentDelete = (
    session?.user?.role === "Full Access"
    || (session?.user?.permissions as string[])?.includes("*")
    || (session?.user?.permissions as string[])?.includes("manage_users")
  ) ?? false

  // ── Column resize ──────────────────────────────────────────────────────────
  const COLS = useMemo(() => [
    { key: "id"            as SortKey, label: "Request ID",      defaultW: 140 },
    { key: "title"         as SortKey, label: "Request Title",   defaultW: 200 },
    { key: "createdAt"     as SortKey, label: "Submission Date", defaultW: 130 },
    { key: "requesterName" as SortKey, label: "Requester Name",  defaultW: 150 },
    { key: "module"        as SortKey, label: "Module",          defaultW: 110 },
    { key: "status"        as SortKey, label: "Status",          defaultW: 120 },
    { key: "assignedToName" as SortKey, label: "Assigned To",     defaultW: 160 },
    { key: "updatedAt"     as SortKey, label: "Last Update Date",defaultW: 140 },
    { key: "actions"       as SortKey, label: "",                defaultW: 50   },
  ], [])

  const [colWidths, setColWidths]   = useState<(number | null)[]>(() => COLS.map(() => null))
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLTableElement>(null)

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
    return sortDir === "asc"
      ? <ChevronUp className="h-3 w-3 ml-1 shrink-0" />
      : <ChevronDown className="h-3 w-3 ml-1 shrink-0" />
  }

  useEffect(() => {
    const load = () => {
      initializeMockData()
      setRequests(getRequests())
      setTasks(getTasks())
    }
    load()
    window.addEventListener("storage", load)
    window.addEventListener("arp:storage", load)
    return () => {
      window.removeEventListener("storage", load)
      window.removeEventListener("arp:storage", load)
    }
  }, [])

  useEffect(() => {
    if (!exportOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [exportOpen])

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
    inProgress: requests.filter((r) => r.status === "in_progress").length,
    completed: requests.filter((r) => r.status === "completed").length,
  }), [requests])

  const tabCount = (tab: ModuleTab) =>
    tab === "all" ? requests.length : requests.filter((r) => r.module === tab).length

  const tabs: { key: ModuleTab; label: string }[] = [
    { key: "all",         label: "All" },
    { key: "hr",          label: "HR" },
    { key: "general",     label: "General" },
    { key: "shipping",    label: "Shipping" },
    { key: "maintenance", label: "Maintenance" },
    { key: "purchase",    label: "Purchase" },
    { key: "event",       label: "Event" },
    { key: "travel",      label: "Travel" },
  ]

  const handleStatusChange = (id: string, newStatus: string) => {
    const request = requests.find(r => r.id === id)
    const currentUserId = session?.user?.id || "USR-001"
    const oldStatus = request?.status
    setRequests(prev => prev.map(r =>
      r.id === id ? { ...r, status: newStatus as RequestStatus, updatedAt: new Date().toISOString() } : r
    ))
    updateStatus(id, newStatus as RequestStatus, currentUserId)
    if (request) {
      createRequestUpdateNotifications({
        requestId: id,
        requestTitle: request.title,
        module: request.module,
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

  const handleCancelRequest = (id: string) => {
    if (confirm("Are you sure you want to cancel this request?")) {
      handleStatusChange(id, "cancelled")
    }
  }

  // ── Export ────────────────────────────────────────────────────────────────
  function buildCsvRows() {
    const headers = ["Request ID", "Request Title", "Submission Date", "Requester Name", "Requester Email", "Module", "Status", "Last Update Date"]
    const rows = filtered.map((r) => [
      r.id,
      r.title,
      fmtDate(r.createdAt),
      r.requesterName,
      r.requesterEmail,
      formatModule(r.module),
      getStatusLabel(r.status, r.module),
      fmtDateTime(r.updatedAt),
    ])
    return [headers, ...rows]
  }

  function exportCsv() {
    const rows = buildCsvRows()
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n")
    const blob = new Blob(["﻿" + csv, ], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `all-requests-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setExportOpen(false)
  }

  function exportGoogleSheets() {
    const rows = buildCsvRows()
    const csv = rows.map((row) => row.join("\t")).join("\n")
    const encoded = encodeURIComponent(csv)
    // Opens Google Sheets import dialog with the data pre-loaded via a data URI paste workaround
    // Best practice: copy TSV to clipboard then open sheets
    navigator.clipboard.writeText(rows.map((row) => row.join("\t")).join("\n")).then(() => {
      window.open("https://sheets.new", "_blank")
      setExportOpen(false)
    }).catch(() => {
      // Fallback: just open sheets
      window.open("https://sheets.new", "_blank")
      setExportOpen(false)
    })
  }

  return (
    <div className="space-y-6">

      {/* Team Tasks Quick View - Top Widget */}
      {tasks.length > 0 && (
        <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-purple-900">
                <CheckSquare className="h-5 w-5" />
                Active Team Tasks ({tasks.filter(t => t.status !== "completed" && t.status !== "cancelled").length})
              </span>
              <Link href="/tasks">
                <Button size="sm" variant="outline" className="text-xs">
                  Manage All <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {tasks.slice(0, 3).map((task) => (
                <div key={task.id} className="bg-white rounded-lg p-3 border border-gray-200 hover:border-purple-300 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="text-sm font-medium text-gray-900 line-clamp-2">{task.title}</h4>
                    <Badge className={cn("text-xs border-0 flex-shrink-0", TASK_STATUS_COLORS[task.status].bg, TASK_STATUS_COLORS[task.status].text)}>
                      {TASK_STATUS_LABELS[task.status]}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{task.assignedTo}</p>
                  <p className="text-xs text-gray-500">{task.id}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className={cn("flex items-center justify-between", animationClasses.headerFadeIn)}>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">All Requests</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            All requests submitted by administration team members
          </p>
        </div>
        {(newRequestsCount > 0 || newTasksCount > 0) && (
          <NewItemsAlert requestsCount={newRequestsCount} tasksCount={newTasksCount} variant="icon" className="ml-4" />
        )}
      </div>

      {/* Stat Cards — clickable, synced with status filter */}
      <div className="grid grid-cols-3 gap-4">
        {([
          { key: "new" as const,       label: "New",            value: stats.new,       icon: TrendingUp,   iconBg: "bg-sky-50",      iconColor: "text-sky-600",     activeBg: "bg-sky-500",     activeBorder: "border-sky-500" },
          { key: "in_progress" as const, label: "In Progress",   value: stats.inProgress, icon: Clock,        iconBg: "bg-blue-50",     iconColor: "text-blue-600",    activeBg: "bg-blue-600",    activeBorder: "border-blue-600" },
          { key: "completed" as const, label: "Completed",      value: stats.completed, icon: CheckCircle2, iconBg: "bg-emerald-50",  iconColor: "text-emerald-600", activeBg: "bg-emerald-600", activeBorder: "border-emerald-600" },
        ] as const).map(({ key, label, value, icon: Icon, iconBg, iconColor, activeBg, activeBorder }, index) => {
          const isActive = statusFilter === key
          return (
            <button
              key={key}
              onClick={() => setStatusFilter((p) => p === key ? "all" : key)}
              className={cn(
                "text-left rounded-xl border-2 p-5 flex items-center gap-4 transition-all hover:shadow-md",
                isActive ? `${activeBg} ${activeBorder} text-white shadow-sm` : "bg-white border-gray-100 hover:border-gray-200",
                
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

            {/* Export dropdown */}
            <div className="relative" ref={exportRef}>
              <button
                onClick={() => setExportOpen((o) => !o)}
                className="h-10 inline-flex items-center gap-2 px-4 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
              >
                <Download className="h-4 w-4 text-gray-500" />
                Export
                <ChevronDownIcon className={`h-3.5 w-3.5 text-gray-400 transition-transform ${exportOpen ? "rotate-180" : ""}`} />
              </button>
              {exportOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-56 rounded-xl border border-gray-200 bg-white shadow-lg z-50 overflow-hidden">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Export {filtered.length} records</p>
                  </div>
                  <button
                    onClick={exportCsv}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <div className="bg-emerald-100 rounded-lg p-1.5">
                      <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Export as CSV</p>
                      <p className="text-xs text-gray-400">Opens in Excel or any spreadsheet app</p>
                    </div>
                  </button>
                  <button
                    onClick={exportGoogleSheets}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
                  >
                    <div className="bg-blue-100 rounded-lg p-1.5">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <rect x="4" y="2" width="16" height="20" rx="2" fill="#0F9D58"/>
                        <rect x="8" y="8" width="8" height="1.5" rx="0.5" fill="white"/>
                        <rect x="8" y="11.5" width="8" height="1.5" rx="0.5" fill="white"/>
                        <rect x="8" y="15" width="5" height="1.5" rx="0.5" fill="white"/>
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Open in Google Sheets</p>
                      <p className="text-xs text-gray-400">Data copied to clipboard — paste in Sheets</p>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Status quick pills */}
            <div className="flex flex-wrap gap-1.5 items-center">
              {(["all", "active", ...STATUSES] as const).map((s) => {
                const activeClass = s === "all" ? "bg-slate-900 border-slate-900 text-white"
                  : s === "active" ? "bg-indigo-600 border-indigo-600 text-white" : {
                  new:               "bg-sky-500 border-sky-500 text-white",
                  in_progress:       "bg-blue-600 border-blue-600 text-white",
                  in_customs:        "bg-amber-600 border-amber-600 text-white",
                  awaiting_approval: "bg-amber-500 border-amber-500 text-white",
                  delivered:         "bg-green-600 border-green-600 text-white",
                  completed:         "bg-emerald-600 border-emerald-600 text-white",
                  cancelled:         "bg-red-600 border-red-600 text-white",
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
                    {/* Sort trigger */}
                    <button
                      onClick={() => handleSort(col.key)}
                      className="inline-flex items-center gap-0.5 hover:text-white transition-colors w-full"
                    >
                      {col.label}
                      <SortIcon col={col.key} />
                    </button>

                    {/* Resize handle */}
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
                const moduleStatuses = MODULE_STATUSES[req.module] || []
                return (
                <React.Fragment key={req.id}>
                <tr
                  className={cn(
                    "border-b border-gray-100 hover:bg-blue-50/30 transition-colors",
                    hasUnreadComments ? "bg-blue-50" : (i % 2 === 0 ? "bg-white" : "bg-gray-50/40"),
                    
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
                    <span className="text-sm font-medium text-gray-700 whitespace-nowrap">{fmtDate(req.createdAt)}</span>
                  </td>
                  <td className="py-3 px-3 overflow-hidden">
                    <div className="text-sm font-medium text-gray-700 truncate">{req.requesterName}</div>
                    <div className="text-sm font-medium text-gray-600 truncate">{req.requesterEmail}</div>
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
                      const moduleLabels = MODULE_STATUS_LABELS[req.module] || STATUS_LABELS
                      const { statusColors, statusDot } = buildLabelDrivenMaps(moduleStatuses, moduleLabels)
                      return (
                        <InlineStatusSelect
                          currentStatus={req.status}
                          statuses={moduleStatuses}
                          statusColors={statusColors}
                          statusDot={statusDot}
                          statusLabels={moduleLabels}
                          onStatusChange={(newStatus) => handleStatusChange(req.id, newStatus)}
                          canUpdateStatus={canUpdateStatus}
                        />
                      )
                    })()}
                  </td>
                  <td className="py-3 px-3">
                    <AssigneeSelect
                      compact
                      disabled={!canAssign}
                      value={req.assignedToId ?? null}
                      onChange={(assignee) => {
                        assignRequest(req.id, assignee)
                        setRequests((prev) => prev.map((r) => r.id === req.id ? {
                          ...r,
                          assignedToId: assignee?.id ?? null,
                          assignedToName: assignee?.name ?? null,
                          assignedToEmail: assignee?.email ?? null,
                        } : r))
                        if (assignee) {
                          createAssignmentNotifications({
                            requestId: req.id,
                            requestTitle: req.title,
                            module: req.module,
                            assigneeId: assignee.id,
                            assigneeName: assignee.name,
                            assigneeEmail: assignee.email,
                            actorName: session?.user?.name ?? undefined,
                            actorEmail: session?.user?.email ?? undefined,
                          })
                        }
                      }}
                    />
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-sm font-medium text-gray-700 whitespace-nowrap">{fmtDateTime(req.updatedAt)}</span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <RequestActionsMenu
                      requestId={req.id}
                      // HR module has no Cancelled status — hide Cancel for HR rows
                      // regardless of permission.
                      showCancelOption={canCancelRequest && req.module !== "hr"}
                      showDeleteOption={canPermanentDelete}
                      isExpanded={isExpanded(req.id)}
                      onViewDetails={() => toggleRow(req.id)}
                      onEdit={canEditRequest ? (id) => {
                        window.open(`/requests/${id}?source=all-requests`, '_blank')
                      } : undefined}
                      onCancel={handleCancelRequest}
                      onDelete={(id) => {
                        if (!confirm(`Permanently delete ${id}? This cannot be undone.`)) return
                        deleteRequestPermanently(id)
                        setRequests((prev) => prev.filter((r) => r.id !== id))
                      }}
                    />
                  </td>
                </tr>
                {isExpanded(req.id) && (
                  <tr className="bg-blue-50">
                    <td colSpan={9} className="py-4 px-6">
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
                            <p className="text-gray-600">{fmtDate(req.createdAt)}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-700">Last Update</p>
                            <p className="text-gray-600">{fmtDateTime(req.updatedAt)}</p>
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
                  <td colSpan={9} className="text-center text-gray-400 text-sm py-16">
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
          </div>
      </Card>

    </div>
  )
}
