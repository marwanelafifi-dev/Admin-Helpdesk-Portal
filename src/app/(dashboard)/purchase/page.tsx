"use client"

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Search, Plus, ShoppingCart, Clock, CheckCircle2, ChevronUp, ChevronDown, ChevronsUpDown, MessageCircle } from "lucide-react"
import { Card, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { getRequests, initializeMockData, updateStatus, getRequestById, getAllCcEmails, type EngineRequest, type RequestStatus } from "@/services/engineService"
import { createRequestUpdateNotifications } from "@/lib/notificationStore"
import { cn } from "@/lib/utils"
import { useCommentCounts } from "@/hooks/useCommentCounts"
import { useViewedComments } from "@/hooks/useViewedComments"
import { useExpandedRows } from "@/hooks/useExpandedRows"
import { InlineStatusSelect } from "@/components/ui/InlineStatusSelect"
import { RequestActionsMenu } from "@/components/ui/RequestActionsMenu"
import { useNewRequestsAndTasks } from "@/hooks/useNewRequestsAndTasks"
import { NewItemsAlert } from "@/components/ui/NewItemsAlert"

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  new: "New", on_hold: "In Progress", in_customs: "Awaiting Approval",
  delivered: "Delivered", cancelled: "Cancelled",
}

const STATUS_COLORS: Record<string, string> = {
  new: "bg-sky-50 text-sky-700", on_hold: "bg-blue-50 text-blue-700",
  in_customs: "bg-amber-50 text-amber-700", delivered: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-600",
}

const STATUS_DOT: Record<string, string> = {
  new: "bg-sky-500", on_hold: "bg-blue-500", in_customs: "bg-amber-500",
  delivered: "bg-green-500", cancelled: "bg-red-500",
}

const STATUS_PILL_ACTIVE: Record<string, string> = {
  new: "bg-sky-500 border-sky-500 text-white",
  on_hold: "bg-blue-600 border-blue-600 text-white",
  in_customs: "bg-amber-600 border-amber-600 text-white",
  delivered: "bg-green-600 border-green-600 text-white",
  cancelled: "bg-red-600 border-red-600 text-white",
}

const STATUSES = ["new", "in_customs", "on_hold", "delivered", "cancelled"] as const

type SortKey = "id" | "title" | "supplier" | "estimatedPrice" | "requesterName" | "createdAt" | "status" | "updatedAt"

const COLS: { key: SortKey; label: string; defaultW: number }[] = [
  { key: "id",             label: "Request ID",      defaultW: 130 },
  { key: "title",          label: "Request Title",   defaultW: 200 },
  { key: "createdAt",      label: "Submission Date", defaultW: 140 },
  { key: "requesterName",  label: "Requester Name",  defaultW: 160 },
  { key: "supplier",       label: "Supplier",        defaultW: 140 },
  { key: "estimatedPrice", label: "Estimated Price", defaultW: 140 },
  { key: "status",         label: "Status",          defaultW: 130 },
  { key: "updatedAt",      label: "Last Update Date",defaultW: 140 },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PurchasePage() {
  const { data: session } = useSession()
  const [requests, setRequests]           = useState<EngineRequest[]>([])
  const [search, setSearch]               = useState("")
  const [statusFilter, setStatusFilter]   = useState("all")
  const [sortKey, setSortKey]             = useState<SortKey>("updatedAt")
  const [sortDir, setSortDir]             = useState<"asc" | "desc">("desc")
  const [colWidths, setColWidths]         = useState<(number | null)[]>(() => COLS.map(() => null))
  const tableRef = useRef<HTMLTableElement>(null)

  const canUpdateStatus = ((session?.user?.permissions as string[])?.includes("update_status") || (session?.user?.permissions as string[])?.includes("*")) ?? false
  const canEditRequest = ((session?.user?.permissions as string[])?.includes("edit_request") || (session?.user?.permissions as string[])?.includes("*")) ?? false
  const canCancelRequest = ((session?.user?.permissions as string[])?.includes("cancel_request") || (session?.user?.permissions as string[])?.includes("*")) ?? false

  const { newRequestsCount, newTasksCount } = useNewRequestsAndTasks()

  useEffect(() => {
    initializeMockData()
    setRequests(getRequests().filter((r) => r.module === "purchase"))
  }, [])

  function handleStatusChange(id: string, newStatus: string) {
    const request = requests.find(r => r.id === id)
    const currentUserId = session?.user?.id || "USR-001"
    const oldStatus = request?.status
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus as RequestStatus, updatedAt: new Date().toISOString() } : r))
    updateStatus(id, newStatus as RequestStatus, currentUserId)

    if (request) {
      createRequestUpdateNotifications({
        requestId: id,
        requestTitle: request.title,
        module: "purchase",
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

  const filtered = useMemo(() => {
    let result = requests
    if (statusFilter !== "all") result = result.filter((r) => r.status === statusFilter)
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
      if (sortKey === "estimatedPrice") {
        const aVal = Number((a.payload as Record<string, unknown>).estimatedPrice ?? 0)
        const bVal = Number((b.payload as Record<string, unknown>).estimatedPrice ?? 0)
        return sortDir === "asc" ? aVal - bVal : bVal - aVal
      }
      if (sortKey === "supplier") return String((a.payload as Record<string, unknown>).supplier ?? "").localeCompare(String((b.payload as Record<string, unknown>).supplier ?? ""))
      av = (a[sortKey as keyof EngineRequest] as string) ?? ""
      bv = (b[sortKey as keyof EngineRequest] as string) ?? ""
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av)
    })
  }, [requests, statusFilter, search, sortKey, sortDir])

  const counts = useMemo(() => ({
    total:   requests.length,
    new:     requests.filter((r) => r.status === "new").length,
    inProgress: requests.filter((r) => r.status === "on_hold").length,
    awaitingApproval: requests.filter((r) => r.status === "in_customs").length,
    delivered: requests.filter((r) => r.status === "delivered").length,
  }), [requests])

  const statCards = [
    { key: "all",         label: "Total Orders",       value: counts.total,               icon: ShoppingCart, iconBg: "bg-blue-50",   iconColor: "text-blue-600",    activeBg: "bg-slate-800",  activeBorder: "border-slate-800" },
    { key: "new",         label: "New",                value: counts.new,                 icon: Clock,        iconBg: "bg-sky-50",    iconColor: "text-sky-600",     activeBg: "bg-sky-500",    activeBorder: "border-sky-500" },
    { key: "in_customs",  label: "Awaiting Approval",  value: counts.awaitingApproval,   icon: Clock,        iconBg: "bg-amber-50",  iconColor: "text-amber-600",   activeBg: "bg-amber-500",  activeBorder: "border-amber-500" },
    { key: "on_hold",     label: "In Progress",        value: counts.inProgress,          icon: Clock,        iconBg: "bg-blue-50",   iconColor: "text-blue-600",    activeBg: "bg-blue-600",   activeBorder: "border-blue-600" },
    { key: "delivered",   label: "Delivered",          value: counts.delivered,           icon: CheckCircle2, iconBg: "bg-green-50",  iconColor: "text-green-600",   activeBg: "bg-green-600",  activeBorder: "border-green-600" },
  ] as const

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Purchase</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage purchase orders and procurement requests</p>
        </div>
        {(newRequestsCount > 0 || newTasksCount > 0) && (
          <NewItemsAlert requestsCount={newRequestsCount} tasksCount={newTasksCount} variant="icon" className="ml-4" />
        )}
        <Link href="/purchase/new">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white ml-4">
            <Plus className="h-4 w-4 mr-2" />
            New Purchase Request
          </Button>
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-5 gap-4">
        {statCards.map(({ key, label, value, icon: Icon, iconBg, iconColor, activeBg, activeBorder }, index) => {
          const isActive = statusFilter === key || (key === "all" && statusFilter === "all")
          return (
            <button
              key={key}
              onClick={() => setStatusFilter(key === "all" ? "all" : (p) => p === key ? "all" : key)}
              className={cn(
                "text-left rounded-xl border-2 p-5 flex items-center gap-4 transition-all hover:shadow-md",
                isActive ? `${activeBg} ${activeBorder} text-white shadow-sm` : "bg-white border-gray-100 hover:border-gray-200",
                
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
            Showing {filtered.length} order{filtered.length !== 1 ? "s" : ""}
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
                <React.Fragment key={req.id}>
                <tr className={cn("border-b border-gray-100 hover:bg-blue-50/30 transition-colors", hasUnreadComments ? "bg-blue-50" : (i % 2 === 0 ? "bg-white" : "bg-gray-50/40"))}>
                  <td className="py-3 overflow-hidden" style={{ paddingLeft: 20, paddingRight: 8 }}>
                    <div className="flex items-center gap-2">
                      <Link href={`/requests/${req.id}?source=purchase`} className="text-sm font-medium text-blue-600 truncate block hover:underline">
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
                    <span className="text-sm font-medium text-gray-700 truncate block">{formatDate(req.createdAt)}</span>
                  </td>
                  <td className="py-3 px-3 overflow-hidden">
                    <span className="text-sm font-medium text-gray-700 truncate block">{req.requesterName}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-sm font-medium text-gray-700">{String((req.payload as Record<string, unknown>).supplier ?? "—")}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-sm font-medium text-gray-700">
                      EGP {Number((req.payload as Record<string, unknown>).estimatedPrice ?? 0).toLocaleString()}
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
                      canUpdateStatus={canUpdateStatus}
                    />
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-sm font-medium text-gray-700">{formatDate(req.updatedAt)}</span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <RequestActionsMenu
                      requestId={req.id}
                      showCancelOption={canCancelRequest}
                      isExpanded={isExpanded(req.id)}
                      onViewDetails={() => toggleRow(req.id)}
                      onEdit={canEditRequest ? (id) => window.open(`/requests/${id}?source=purchase`, '_blank') : undefined}
                      onCancel={handleCancelRequest}
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
                            <p className="font-semibold text-gray-700">Supplier</p>
                            <p className="text-gray-600">{String((req.payload as Record<string, unknown>).supplier ?? "—")}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-700">Estimated Price</p>
                            <p className="text-gray-600">EGP {Number((req.payload as Record<string, unknown>).estimatedPrice ?? 0).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-700">Status</p>
                            <p className="text-gray-600">{STATUS_LABELS[req.status] || req.status}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-700">Requester</p>
                            <p className="text-gray-600">{req.requesterName}</p>
                          </div>
                          {!!(req.payload as Record<string, unknown>).productUrl && (
                            <div>
                              <p className="font-semibold text-gray-700">Product URL</p>
                              <a
                                href={String((req.payload as Record<string, unknown>).productUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline break-all text-sm"
                              >
                                {String((req.payload as Record<string, unknown>).productUrl)}
                              </a>
                            </div>
                          )}
                          {!!(req.payload as Record<string, unknown>).description && (
                            <div className="col-span-2">
                              <p className="font-semibold text-gray-700">Description</p>
                              <p className="text-gray-600">{String((req.payload as Record<string, unknown>).description)}</p>
                            </div>
                          )}
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
                  <td colSpan={9} className="py-16 text-center text-gray-400 text-sm">
                    No orders match the current filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {filtered.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 text-[11px] text-gray-400 text-right">
              Showing {filtered.length} of {requests.length} orders
            </div>
          )}
            </div>
          </div>
      </Card>
    </div>
  )
}

