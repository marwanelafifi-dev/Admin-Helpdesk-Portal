"use client"

import React, { useState, useMemo, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { Search, Plus, Package, Truck, CheckCircle2, Clock, MoreHorizontal, ChevronUp, ChevronDown, ChevronsUpDown, MessageCircle } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { mockShipments, type MockShipment } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { getRequestsByModule, initializeMockData, updateStatus } from "@/services/engineService"
import { notifyStatusChange } from "@/services/notificationService"
import { useCommentCounts } from "@/hooks/useCommentCounts"
import { useViewedComments } from "@/hooks/useViewedComments"
import { useExpandedRows } from "@/hooks/useExpandedRows"
import { InlineStatusSelect } from "@/components/ui/InlineStatusSelect"
import { RequestActionsMenu } from "@/components/ui/RequestActionsMenu"

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUSES = ["new", "in_customs", "delivered", "cancelled"] as const
const CARRIERS = ["DHL", "FedEx", "UPS", "Aramex", "Other"] as const

const STATUS_LABELS: Record<string, string> = {
  new: "New", in_customs: "In Customs", delivered: "Delivered", cancelled: "Cancelled",
}

const STATUS_COLORS: Record<string, string> = {
  new:        "bg-sky-50 text-sky-700",
  in_customs: "bg-amber-50 text-amber-700",
  delivered:  "bg-green-50 text-green-700",
  cancelled:  "bg-red-50 text-red-600",
}

const STATUS_DOT: Record<string, string> = {
  new:        "bg-sky-500",
  in_customs: "bg-amber-500",
  delivered:  "bg-green-500",
  cancelled:  "bg-red-500",
}

const STATUS_PILL_ACTIVE: Record<string, string> = {
  new:        "bg-sky-500 border-sky-500 text-white",
  in_customs: "bg-amber-600 border-amber-600 text-white",
  delivered:  "bg-green-600 border-green-600 text-white",
  cancelled:  "bg-red-600 border-red-600 text-white",
}

type SortKey = keyof Pick<MockShipment, "id" | "title" | "pickupDate" | "trackingNumber" | "poNumber" | "costCenter" | "carrier" | "requester" | "status" | "expectedDelivery" | "lastUpdate">

const COLS: { key: SortKey; label: string; defaultW: number }[] = [
  { key: "id",              label: "Request ID",          defaultW: 120 },
  { key: "title",           label: "Request Title",       defaultW: 160 },
  { key: "pickupDate",      label: "Pickup Date",         defaultW: 120 },
  { key: "trackingNumber",  label: "Tracking Number",     defaultW: 160 },
  { key: "poNumber",        label: "PO Number",           defaultW: 120 },
  { key: "costCenter",      label: "Cost Center",         defaultW: 120 },
  { key: "carrier",         label: "Carrier",             defaultW: 110 },
  { key: "requester",       label: "Requester Name",      defaultW: 140 },
  { key: "status",          label: "Status",              defaultW: 120 },
  { key: "expectedDelivery",label: "Delivery Date",       defaultW: 120 },
  { key: "lastUpdate",      label: "Last Update Date",    defaultW: 120 },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReceivingPage() {
  const { data: session } = useSession()
  const [search, setSearch]           = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [carrierFilter, setCarrierFilter] = useState("all")
  const [sortKey, setSortKey]         = useState<SortKey>("id")
  const [sortDir, setSortDir]         = useState<"asc" | "desc">("asc")
  const [colWidths, setColWidths]     = useState<(number | null)[]>(() => COLS.map(() => null))
  const tableRef = useRef<HTMLTableElement>(null)
  const [shipments, setShipments] = useState<MockShipment[]>(mockShipments)
  const [loading, setLoading] = useState(true)

  const canUpdateStatus = ((session?.user?.permissions as string[])?.includes("update_status") || (session?.user?.permissions as string[])?.includes("*")) ?? false
  const canEditRequest = ((session?.user?.permissions as string[])?.includes("edit_request") || (session?.user?.permissions as string[])?.includes("*")) ?? false
  const canCancelRequest = ((session?.user?.permissions as string[])?.includes("cancel_request") || (session?.user?.permissions as string[])?.includes("*")) ?? false
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchShipments = () => {
      try {
        setLoading(true)
        // Initialize mock data if needed
        initializeMockData()
        // Get shipping requests from engineService
        const requests = getRequestsByModule("shipping")
        const transformed = requests.map((req: any) => {
          return {
            id: req.id,
            title: req.title || "Untitled Request",
            trackingNumber: req.payload?.trackingNumber || "",
            carrier: req.payload?.carrier || "",
            origin: req.payload?.origin || "N/A",
            destination: req.payload?.destination || "N/A",
            status: req.status || "new",
            expectedDelivery: new Date(req.updatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
            requester: req.requesterName || req.requesterId || "Unknown",
            pickupDate: new Date(req.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
            poNumber: req.payload?.poNumber || "",
            costCenter: req.payload?.costCenter || "",
            lastUpdate: new Date(req.updatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
          }
        })
        setShipments(transformed)
        setError(null)
      } catch (err) {
        console.error("Failed to fetch shipments:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch shipments")
        setShipments(mockShipments)
      } finally {
        setLoading(false)
      }
    }

    fetchShipments()
  }, [])

  function handleStatusChange(id: string, newStatus: string) {
    const shipment = shipments.find(s => s.id === id)
    const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    setShipments(prev => prev.map(s => s.id === id ? { ...s, status: newStatus as any, lastUpdate: today } : s))
    updateStatus(id, newStatus as any, "USR-001")
    if (shipment) {
      notifyStatusChange("USR-001", id, shipment.title || shipment.id, "shipping", newStatus)
    }
  }

  function handleCancelRequest(id: string) {
    if (confirm("Are you sure you want to cancel this request?")) {
      handleStatusChange(id, "cancelled")
    }
  }

  const commentCounts = useCommentCounts(shipments.map(s => s.id))
  const { viewedComments } = useViewedComments()
  const { expandedRows, toggleRow, isExpanded } = useExpandedRows()

  // ── Resize ──────────────────────────────────────────────────────────────
  function onResizeMouseDown(e: React.MouseEvent, idx: number) {
    e.preventDefault(); e.stopPropagation()
    const startX = e.clientX
    // Read actual rendered width from DOM at drag start
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

  // ── Sort ────────────────────────────────────────────────────────────────
  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("asc") }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronsUpDown className="h-3 w-3 ml-1 opacity-40 shrink-0" />
    return sortDir === "asc" ? <ChevronUp className="h-3 w-3 ml-1 shrink-0" /> : <ChevronDown className="h-3 w-3 ml-1 shrink-0" />
  }

  const filtered = useMemo(() => {
    let result = shipments.filter((s) => {
      const q = search.toLowerCase()
      const matchSearch = s.id.toLowerCase().includes(q) || s.trackingNumber.toLowerCase().includes(q) || s.destination.toLowerCase().includes(q) || s.requester.toLowerCase().includes(q)
      const matchStatus  = statusFilter === "all" || s.status === statusFilter
      const matchCarrier = carrierFilter === "all" || s.carrier === carrierFilter
      return matchSearch && matchStatus && matchCarrier
    })
    return result.sort((a, b) => {
      const av = a[sortKey] ?? "", bv = b[sortKey] ?? ""
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av)
    })
  }, [search, statusFilter, carrierFilter, sortKey, sortDir, shipments])

  const stats = useMemo(() => ({
    total:     shipments.length,
    inCustoms: shipments.filter((s) => s.status === "in_customs").length,
    delivered: shipments.filter((s) => s.status === "delivered").length,
  }), [shipments])

  const statCards = [
    { key: "all",        label: "Total Shipments", value: stats.total,     icon: Package,      iconBg: "bg-blue-50",   iconColor: "text-blue-600",   activeBg: "bg-slate-800",  activeBorder: "border-slate-800" },
    { key: "in_customs", label: "In Customs",      value: stats.inCustoms, icon: Clock,        iconBg: "bg-amber-50",  iconColor: "text-amber-600",  activeBg: "bg-amber-600",  activeBorder: "border-amber-600" },
    { key: "delivered",  label: "Delivered",       value: stats.delivered, icon: CheckCircle2, iconBg: "bg-green-50",  iconColor: "text-green-600",  activeBg: "bg-green-600",  activeBorder: "border-green-600" },
  ] as const

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Receiving</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Track incoming shipments and deliveries</p>
        </div>
        <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
          <Link href="/shipping/receiving/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Receiving Request
          </Link>
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error} — Showing cached data below
        </div>
      )}

      {loading && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center text-gray-600">
          Loading shipments...
        </div>
      )}

      {/* Stat Cards — clickable */}
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

          {/* Search + filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID, tracking, requester, or destination..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Status pills */}
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

          {/* Carrier pills */}
          <div className="flex items-center gap-3 flex-wrap mt-1">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest w-12 shrink-0">Carrier</span>
            <div className="flex flex-wrap gap-1.5">
              {(["all", ...CARRIERS] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCarrierFilter(c)}
                  className={cn(
                    "h-6 px-2.5 rounded text-[11px] font-medium border transition-all",
                    carrierFilter === c
                      ? "bg-gray-900 border-gray-900 text-white"
                      : "bg-white border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700"
                  )}
                >
                  {c === "all" ? "All" : c}
                </button>
              ))}
            </div>
          </div>

          <p className="text-sm text-muted-foreground font-normal mt-1">
            Showing {filtered.length} shipment{filtered.length !== 1 ? "s" : ""}
          </p>
        </CardHeader>

        {/* Table */}
        <div className="overflow-x-auto overflow-y-visible">
          <table ref={tableRef} className="w-full text-sm" style={{ tableLayout: colWidths.some(w => w !== null) ? "fixed" : "auto" }}>
            <colgroup>
              {colWidths.map((w, i) => <col key={i} style={w !== null ? { width: w } : undefined} />)}
              <col style={{ width: 56 }} />
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
                <th className="py-3 text-xs font-semibold text-slate-300 tracking-wide text-left" style={{ paddingLeft: 12 }} />
                <th className="bg-slate-800" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((shipment, i) => {
                const hasUnreadComments = (commentCounts[shipment.id] ?? 0) > (viewedComments[shipment.id] ?? 0)
                return (
                <React.Fragment key={shipment.id}>
                <tr
                  className={cn(
                    "border-b border-gray-100 hover:bg-blue-50/30 transition-colors",
                    hasUnreadComments ? "bg-blue-50" : (i % 2 === 0 ? "bg-white" : "bg-gray-50/40")
                  )}
                >
                  <td className="py-3 overflow-hidden" style={{ paddingLeft: 20, paddingRight: 8 }}>
                    <div className="flex items-center gap-2">
                      <Link href={`/requests/${shipment.id}?source=shipping`} className="text-sm text-blue-600 font-medium tracking-wide truncate block hover:underline">
                        {shipment.id}
                      </Link>
                      {(commentCounts[shipment.id] ?? 0) > 0 && (
                        <span className={cn("flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap flex-shrink-0", hasUnreadComments ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700")}>
                          <MessageCircle className="h-3 w-3" />
                          {commentCounts[shipment.id]}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 overflow-hidden">
                    <span className="text-sm text-gray-700 font-medium truncate block">{shipment.title}</span>
                  </td>
                  <td className="py-3 px-3 overflow-hidden">
                    <span className="text-sm text-gray-700 font-medium whitespace-nowrap">{shipment.pickupDate}</span>
                  </td>
                  <td className="py-3 px-3 overflow-hidden">
                    <span className="text-sm text-gray-700 font-medium truncate block">{shipment.trackingNumber}</span>
                  </td>
                  <td className="py-3 px-3 overflow-hidden">
                    <span className="text-sm text-gray-700 font-medium truncate block">{shipment.poNumber}</span>
                  </td>
                  <td className="py-3 px-3 overflow-hidden">
                    <span className="text-sm text-gray-700 font-medium truncate block">{shipment.costCenter}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-sm text-gray-700 font-medium">{shipment.carrier}</span>
                  </td>
                  <td className="py-3 px-3 overflow-hidden">
                    <span className="text-sm text-gray-700 font-medium truncate block">{shipment.requester}</span>
                  </td>
                  <td className="py-3 px-3">
                    <InlineStatusSelect
                      currentStatus={shipment.status}
                      statuses={STATUSES}
                      statusColors={STATUS_COLORS}
                      statusDot={STATUS_DOT}
                      statusLabels={STATUS_LABELS}
                      onStatusChange={(newStatus) => handleStatusChange(shipment.id, newStatus)}
                      canUpdateStatus={canUpdateStatus}
                    />
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-sm text-gray-700 font-medium whitespace-nowrap">{shipment.expectedDelivery}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-sm text-gray-700 font-medium whitespace-nowrap">{shipment.lastUpdate}</span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <RequestActionsMenu
                      requestId={shipment.id}
                      showCancelOption={canCancelRequest}
                      isExpanded={isExpanded(shipment.id)}
                      onViewDetails={() => toggleRow(shipment.id)}
                      onEdit={canEditRequest ? (id) => window.open(`/requests/${id}?source=shipping`, '_blank') : undefined}
                      onCancel={handleCancelRequest}
                    />
                  </td>
                  <td />
                </tr>
                {isExpanded(shipment.id) && (
                  <tr className="bg-blue-50">
                    <td colSpan={11} className="py-4 px-6">
                      <div className="space-y-3 text-sm">
                        <div className="grid grid-cols-3 gap-6">
                          <div>
                            <p className="font-semibold text-gray-700">Tracking Number</p>
                            <p className="text-gray-600">{shipment.trackingNumber}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-700">Carrier</p>
                            <p className="text-gray-600">{shipment.carrier}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-700">PO Number</p>
                            <p className="text-gray-600">{shipment.poNumber}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-700">Cost Center</p>
                            <p className="text-gray-600">{shipment.costCenter}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-700">Status</p>
                            <p className="text-gray-600">{shipment.status}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-700">Requester</p>
                            <p className="text-gray-600">{shipment.requester}</p>
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
                  <td colSpan={11} className="text-center text-gray-400 text-sm py-16">
                    No shipments match the current filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {filtered.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 text-[11px] text-gray-400 text-right">
              Showing {filtered.length} of {shipments.length} shipments
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
