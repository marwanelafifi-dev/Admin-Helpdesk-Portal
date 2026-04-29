"use client"

import { useEffect, useMemo, useState } from "react"
import { Search } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getRequests, initializeMockData, type EngineRequest, type RequestStatus, type RequestModule } from "@/services/engineService"

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-700",
  new: "bg-gray-100 text-gray-800",
  on_hold: "bg-orange-100 text-orange-800",
  in_transit: "bg-blue-100 text-blue-800",
  delivered: "bg-green-100 text-green-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  new: "New",
  on_hold: "On Hold",
  in_transit: "In Transit",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
}

const MODULE_COLORS: Record<string, string> = {
  shipping: "bg-blue-50 text-blue-700 border border-blue-200",
  maintenance: "bg-purple-50 text-purple-700 border border-purple-200",
  purchase: "bg-green-50 text-green-700 border border-green-200",
  event: "bg-orange-50 text-orange-700 border border-orange-200",
  travel: "bg-pink-50 text-pink-700 border border-pink-200",
  hr: "bg-teal-50 text-teal-700 border border-teal-200",
}

function formatStatus(status: string) {
  return STATUS_LABELS[status] ?? status.replaceAll("_", " ")
}

function formatModule(module: string) {
  return module.charAt(0).toUpperCase() + module.slice(1)
}

export default function RequestsPage() {
  const [search, setSearch] = useState("")
  const [requests, setRequests] = useState<EngineRequest[]>([])
  const [statusFilter, setStatusFilter] = useState<RequestStatus | null>(null)
  const [moduleFilter, setModuleFilter] = useState<RequestModule | null>(null)
  const CURRENT_USER_ID = "USR-001"

  useEffect(() => {
    initializeMockData()
    const sync = () => setRequests(getRequests())
    sync()
    window.addEventListener("focus", sync)
    window.addEventListener("storage", sync)
    return () => {
      window.removeEventListener("focus", sync)
      window.removeEventListener("storage", sync)
    }
  }, [])

  const filtered = useMemo(() => {
    let result = requests.filter((req) => req.requesterId === CURRENT_USER_ID)

    if (statusFilter) {
      result = result.filter((req) => req.status === statusFilter)
    }

    if (moduleFilter) {
      result = result.filter((req) => req.module === moduleFilter)
    }

    const q = search.trim().toLowerCase()
    if (q) {
      result = result.filter((req) => {
        return (
          req.id.toLowerCase().includes(q) ||
          req.title.toLowerCase().includes(q) ||
          req.requesterName.toLowerCase().includes(q)
        )
      })
    }

    return result
  }, [requests, search, statusFilter, moduleFilter])

  const stats = useMemo(() => {
    const userRequests = requests.filter((req) => req.requesterId === CURRENT_USER_ID)
    return {
      total: userRequests.length,
      draft: userRequests.filter((r) => r.status === "draft").length,
      new: userRequests.filter((r) => r.status === "new").length,
      onHold: userRequests.filter((r) => r.status === "on_hold").length,
      inTransit: userRequests.filter((r) => r.status === "in_transit").length,
      delivered: userRequests.filter((r) => r.status === "delivered").length,
      completed: userRequests.filter((r) => r.status === "completed").length,
      cancelled: userRequests.filter((r) => r.status === "cancelled").length,
    }
  }, [requests])

  const statuses: RequestStatus[] = ["draft", "new", "on_hold", "in_transit", "delivered", "completed", "cancelled"]
  const modules: RequestModule[] = ["shipping", "maintenance", "purchase", "event", "travel", "hr"]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Requests</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          View all your requests across all modules
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
        <Card className="bg-gradient-to-br from-slate-50 to-slate-100">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">Total</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-zinc-50 to-zinc-100">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.draft}</div>
            <p className="text-xs text-muted-foreground mt-1">Draft</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-gray-50 to-gray-100">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.new}</div>
            <p className="text-xs text-muted-foreground mt-1">New</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.onHold}</div>
            <p className="text-xs text-muted-foreground mt-1">On Hold</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.inTransit}</div>
            <p className="text-xs text-muted-foreground mt-1">In Transit</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.delivered}</div>
            <p className="text-xs text-muted-foreground mt-1">Delivered</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground mt-1">Completed</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.cancelled}</div>
            <p className="text-xs text-muted-foreground mt-1">Cancelled</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              All Requests <span className="text-muted-foreground font-normal text-sm">({filtered.length})</span>
            </CardTitle>
          </div>

          {/* Filters */}
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

            <Select value={statusFilter || "all"} onValueChange={(value) => setStatusFilter(value === "all" ? null : value as RequestStatus)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="in_transit">In Transit</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={moduleFilter || "all"} onValueChange={(value) => setModuleFilter(value === "all" ? null : value as RequestModule)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Modules" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                <SelectItem value="shipping">Shipping</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="purchase">Purchase</SelectItem>
                <SelectItem value="event">Event</SelectItem>
                <SelectItem value="travel">Travel</SelectItem>
                <SelectItem value="hr">HR</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Request ID</TableHead>
                <TableHead>Request Title</TableHead>
                <TableHead>Requester Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Module</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((req) => {
                const statusClass = STATUS_COLORS[req.status] ?? "bg-zinc-100 text-zinc-700"
                const moduleClass = MODULE_COLORS[req.module] ?? "bg-gray-100 text-gray-700"
                return (
                  <TableRow key={req.id} className="hover:bg-gray-50">
                    <TableCell className="font-mono text-xs text-muted-foreground">{req.id}</TableCell>
                    <TableCell className="text-sm font-medium">{req.title}</TableCell>
                    <TableCell className="text-sm">{req.requesterName}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}`}>
                        {formatStatus(req.status)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${moduleClass}`}>
                        {formatModule(req.module)}
                      </span>
                    </TableCell>
                  </TableRow>
                )
              })}

              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                    No requests found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
