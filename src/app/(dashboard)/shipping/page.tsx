"use client"

import { useState, useMemo, useEffect } from "react"
import { useSession } from "next-auth/react"
import { can, isRestricted } from "@/lib/permissions"
import { Search, Plus, Package, Truck, Clock, CheckCircle2, MoreHorizontal, ChevronUp, ChevronDown, ChevronsUpDown, Trash2 } from "lucide-react"
import Link from "next/link"
import { Card, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { fetchRequests, updateRequestStatus, deleteRequest } from "@/lib/requests-api"
import type { EngineRequest } from "@/lib/requests-api"
import { cn } from "@/lib/utils"

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUSES = ["new", "on_hold", "in_customs", "in_transit", "delivered", "completed", "cancelled"] as const
const CARRIERS = ["DHL", "FedEx", "UPS", "Aramex", "Other"] as const

const STATUS_LABELS: Record<string, string> = {
  new: "New", on_hold: "On Hold", in_customs: "In Customs",
  in_transit: "In Transit", delivered: "Delivered",
  completed: "Completed", cancelled: "Cancelled",
}

const STATUS_COLORS: Record<string, string> = {
  new:        "bg-sky-50 text-sky-700",
  on_hold:    "bg-amber-50 text-amber-700",
  in_customs: "bg-amber-50 text-amber-700",
  in_transit: "bg-blue-50 text-blue-700",
  delivered:  "bg-green-50 text-green-700",
  completed:  "bg-emerald-50 text-emerald-700",
  cancelled:  "bg-red-50 text-red-600",
}

const STATUS_DOT: Record<string, string> = {
  new: "bg-sky-500", on_hold: "bg-amber-500", in_customs: "bg-amber-500",
  in_transit: "bg-blue-500", delivered: "bg-green-500",
  completed: "bg-emerald-500", cancelled: "bg-red-500",
}

const STATUS_PILL_ACTIVE: Record<string, string> = {
  new:        "bg-sky-500 border-sky-500 text-white",
  on_hold:    "bg-amber-500 border-amber-500 text-white",
  in_customs: "bg-amber-600 border-amber-600 text-white",
  in_transit: "bg-blue-600 border-blue-600 text-white",
  delivered:  "bg-green-600 border-green-600 text-white",
  completed:  "bg-emerald-600 border-emerald-600 text-white",
  cancelled:  "bg-red-600 border-red-600 text-white",
}

type SortKey = "id" | "pickupDate" | "trackingNumber" | "poNumber" | "costCenter" | "carrier" | "requesterName" | "status" | "deliveryDate" | "updatedAt"

const COLS: { key: SortKey; label: string; defaultW: number }[] = [
  { key: "id",             label: "Request ID",      defaultW: 120 },
  { key: "pickupDate",     label: "Pickup Date",     defaultW: 120 },
  { key: "trackingNumber", label: "Tracking Number", defaultW: 160 },
  { key: "poNumber",       label: "PO Number",       defaultW: 120 },
  { key: "costCenter",     label: "Cost Center",     defaultW: 120 },
  { key: "carrier",        label: "Carrier",         defaultW: 110 },
  { key: "requesterName",  label: "Requester Name",  defaultW: 140 },
  { key: "status",         label: "Status",          defaultW: 120 },
  { key: "deliveryDate",   label: "Delivery Date",   defaultW: 120 },
  { key: "updatedAt",      label: "Last Update",     defaultW: 120 },
]

function p(req: EngineRequest): Record<string, unknown> {
  return req.payload as Record<string, unknown>
}

function formatDate(iso?: string) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ShippingPage() {
  const { data: session, status } = useSession()
  const role = session?.user?.role as string | undefined

  const [requests, setRequests]           = useState<EngineRequest[]>([])
  const [search, setSearch]               = useState("")
  const [statusFilter, setStatusFilter]   = useState("all")
  const [carrierFilter, setCarrierFilter] = useState("all")
  const [sortKey, setSortKey]             = useState<SortKey>("id")
  const [sortDir, setSortDir]             = useState<"asc" | "desc">("asc")
  const [colWidths, setColWidths]         = useState<number[]>(() => COLS.map((c) => c.defaultW))

  const load = async () => {
    const requesterId = isRestricted(role) ? session?.user?.id : undefined
    setRequests(await fetchRequests("shipping", requesterId))
  }
  useEffect(() => { if (status !== "loading") load() }, [status, role])

  async function handleStatusUpdate(req: EngineRequest, status: string) {
    await updateRequestStatus("shipping", req.id, status as never, req.requesterName)
    load()
  }
  async function handleDelete(req: EngineRequest) {
    if (!confirm(`Delete ${req.id}?`)) return
    await deleteRequest("shipping", req.id)
    load()
  }

  // ── Resize ────────────────────────────────────────────────────────────────
  function onResizeMouseDown(e: React.MouseEvent, idx: number) {
    e.preventDefault(); e.stopPropagation()
    const startX = e.clientX, startW = colWidths[idx]
    const onMove = (ev: MouseEvent) => {
      const newW = Math.max(60, startW + ev.clientX - startX)
      setColWidths((prev) => prev.map((w, i) => i === idx ? newW : w))
    }
    const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp) }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("asc") }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronsUpDown className="h-3 w-3 ml-1 opacity-40 shrink-0" />
    return sortDir === "asc" ? <ChevronUp className="h-3 w-3 ml-1 shrink-0" /> : <ChevronDown className="h-3 w-3 ml-1 shrink-0" />
  }

  const getSortVal = (req: EngineRequest, key: SortKey): string => {
    const pl = p(req)
    if (key === "pickupDate")     return String(pl.expectedPickupDate ?? "")
    if (key === "trackingNumber") return String(pl.trackingNumber ?? "")
    if (key === "poNumber")       return String(pl.poNumber ?? "")
    if (key === "costCenter")     return String(pl.costCenter ?? "")
    if (key === "carrier")        return String(pl.carrier ?? pl.carrierName ?? "")
    if (key === "deliveryDate")   return String(pl.expectedDeliveryDate ?? "")
    if (key === "requesterName")  return req.requesterName ?? ""
    return String(req[key as keyof EngineRequest] ?? "")
  }

  const filtered = useMemo(() => {
    return requests.filter((req) => {
      const pl = p(req)
      const q = search.toLowerCase()
      const matchSearch = !q || req.id.toLowerCase().includes(q) ||
        String(pl.trackingNumber ?? "").toLowerCase().includes(q) ||
        req.requesterName?.toLowerCase().includes(q) ||
        String(pl.carrier ?? "").toLowerCase().includes(q)
      const matchStatus  = statusFilter === "all" || req.status === statusFilter
      const matchCarrier = carrierFilter === "all" || String(pl.carrier ?? pl.carrierName) === carrierFilter
      return matchSearch && matchStatus && matchCarrier
    }).sort((a, b) => {
      const av = getSortVal(a, sortKey), bv = getSortVal(b, sortKey)
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av)
    })
  }, [requests, search, statusFilter, carrierFilter, sortKey, sortDir])

  const stats = useMemo(() => ({
    total:      requests.length,
    onHold:     requests.filter((r) => r.status === "on_hold").length,
    inTransit:  requests.filter((r) => r.status === "in_transit").length,
    delivered:  requests.filter((r) => r.status === "delivered").length,
  }), [requests])

  const statCards = [
    { key: "all",        label: "Total Shipments", value: stats.total,     icon: Package,      iconBg: "bg-blue-50",   iconColor: "text-blue-600",   activeBg: "bg-slate-800",  activeBorder: "border-slate-800" },
    { key: "on_hold",    label: "On Hold",         value: stats.onHold,    icon: Clock,        iconBg: "bg-amber-50",  iconColor: "text-amber-600",  activeBg: "bg-amber-600",  activeBorder: "border-amber-600" },
    { key: "in_transit", label: "In Transit",      value: stats.inTransit, icon: Truck,        iconBg: "bg-blue-50",   iconColor: "text-blue-600",   activeBg: "bg-blue-600",   activeBorder: "border-blue-600" },
    { key: "delivered",  label: "Delivered",       value: stats.delivered, icon: CheckCircle2, iconBg: "bg-green-50",  iconColor: "text-green-600",  activeBg: "bg-green-600",  activeBorder: "border-green-600" },
  ] as const

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Shipping</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Track and manage all shipment requests</p>
        </div>
        <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
          <Link href="/shipping/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Shipping Request
          </Link>
        </Button>
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
                isActive ? `${activeBg} ${activeBorder} text-white shadow-sm` : "bg-card border-border hover:border-primary/40 dark:hover:border-primary/60"
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
                placeholder="Search by ID, tracking, requester, or carrier..."
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ tableLayout: "fixed", minWidth: colWidths.reduce((a, b) => a + b, 0) + 56 }}>
            <colgroup>
              {colWidths.map((w, i) => <col key={i} style={{ width: w }} />)}
              <col style={{ width: 56 }} />
            </colgroup>
            <thead>
              <tr className="bg-slate-800 border-b border-slate-700">
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
                <th className="py-3 text-xs font-semibold text-slate-300 tracking-wide" style={{ paddingLeft: 12 }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((req, i) => {
                const pl = p(req)
                return (
                  <tr key={req.id} className={cn("border-b border-border hover:bg-accent/30 transition-colors", i % 2 === 0 ? "bg-card" : "bg-muted/20")}>
                    <td className="py-3 overflow-hidden" style={{ paddingLeft: 20, paddingRight: 8 }}>
                      <span className="text-sm text-gray-700 font-medium tracking-wide truncate block">{req.id}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-sm text-gray-700 font-medium whitespace-nowrap">{formatDate(String(pl.expectedPickupDate ?? ""))}</span>
                    </td>
                    <td className="py-3 px-3 overflow-hidden">
                      <span className="text-sm text-gray-700 font-medium truncate block">{String(pl.trackingNumber ?? "—")}</span>
                    </td>
                    <td className="py-3 px-3 overflow-hidden">
                      <span className="text-sm text-gray-700 font-medium truncate block">{String(pl.poNumber ?? "—")}</span>
                    </td>
                    <td className="py-3 px-3 overflow-hidden">
                      <span className="text-sm text-gray-700 font-medium truncate block">{String(pl.costCenter ?? "—")}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-sm text-gray-700 font-medium">{String(pl.carrier === "Other" ? (pl.carrierName ?? "Other") : (pl.carrier ?? "—"))}</span>
                    </td>
                    <td className="py-3 px-3 overflow-hidden">
                      <span className="text-sm text-gray-700 font-medium truncate block">{req.requesterName}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap", STATUS_COLORS[req.status] ?? "bg-zinc-100 text-zinc-600")}>
                        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", STATUS_DOT[req.status] ?? "bg-gray-400")} />
                        {STATUS_LABELS[req.status] ?? req.status}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-sm text-gray-700 font-medium whitespace-nowrap">{formatDate(String(pl.expectedDeliveryDate ?? ""))}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-sm text-gray-700 font-medium whitespace-nowrap">{formatDate(req.updatedAt)}</span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-gray-600">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          {STATUSES.filter(s => s !== req.status).map(s => (
                            <DropdownMenuItem key={s} onClick={() => handleStatusUpdate(req, s)} className="cursor-pointer text-xs">
                              → {STATUS_LABELS[s]}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                          {can(role, "deleteRequests") && (
                            <DropdownMenuItem onClick={() => handleDelete(req)} className="cursor-pointer text-xs text-red-600 focus:text-red-600">
                              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
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
              Showing {filtered.length} of {requests.length} shipments
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
