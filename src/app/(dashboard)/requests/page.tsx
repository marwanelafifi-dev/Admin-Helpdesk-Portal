"use client"

import { useEffect, useMemo, useState } from "react"
import { Search } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getRequests, type EngineRequest } from "@/services/engineService"

type ShippingPayload = {
  trackingNumber?: string
  carrier?: string
  poNumber?: string
  expectedDeliveryDate?: string
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  pending_approval: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-zinc-100 text-zinc-700",
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ")
}

export default function RequestsPage() {
  const [search, setSearch] = useState("")
  const [requests, setRequests] = useState<EngineRequest[]>([])

  useEffect(() => {
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
    const q = search.trim().toLowerCase()
    if (!q) return requests
    return requests.filter((req) => {
      const payload = (req.payload ?? {}) as ShippingPayload
      return (
        req.id.toLowerCase().includes(q) ||
        req.requesterName.toLowerCase().includes(q) ||
        (payload.trackingNumber ?? "").toLowerCase().includes(q) ||
        (payload.carrier ?? "").toLowerCase().includes(q) ||
        (payload.poNumber ?? "").toLowerCase().includes(q)
      )
    })
  }, [requests, search])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Requests</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Manage and track all requests
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">
            All Requests <span className="text-muted-foreground font-normal text-sm">({filtered.length})</span>
          </CardTitle>
          <div className="relative mt-3 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ID, requester, tracking number, carrier, or PO..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Request ID</TableHead>
                <TableHead>Requester Name</TableHead>
                <TableHead>Tracking Number</TableHead>
                <TableHead>Carrier</TableHead>
                <TableHead>PO Number</TableHead>
                <TableHead>Delivery Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((req) => {
                const payload = (req.payload ?? {}) as ShippingPayload
                const statusClass = STATUS_COLORS[req.status] ?? "bg-zinc-100 text-zinc-700"
                return (
                  <TableRow key={req.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{req.id}</TableCell>
                    <TableCell className="text-sm">{req.requesterName}</TableCell>
                    <TableCell className="text-sm">{payload.trackingNumber ?? "-"}</TableCell>
                    <TableCell className="text-sm">{payload.carrier ?? "-"}</TableCell>
                    <TableCell className="text-sm">{payload.poNumber ?? "-"}</TableCell>
                    <TableCell className="text-sm">{payload.expectedDeliveryDate ?? "-"}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}`}>
                        {formatStatus(req.status)}
                      </span>
                    </TableCell>
                  </TableRow>
                )
              })}

              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
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
