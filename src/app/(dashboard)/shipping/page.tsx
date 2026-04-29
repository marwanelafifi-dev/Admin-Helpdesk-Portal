"use client"

import { useState, useMemo } from "react"
import { Search, Plus, Package, Truck, CheckCircle2, MoreHorizontal } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { mockShipments, mockStats, type MockShipment } from "@/lib/mock-data"

const STATUS_COLORS: Record<string, string> = {
  New: "bg-gray-100 text-gray-800",
  "On Hold": "bg-orange-100 text-orange-800",
  "In Transit": "bg-blue-100 text-blue-800",
  Delivered: "bg-green-100 text-green-800",
  Cancelled: "bg-red-100 text-red-800",
}

interface ShipStatCardProps {
  title: string
  value: number
  icon: React.ElementType
  iconColor: string
  iconBg: string
}

function ShipStatCard({ title, value, icon: Icon, iconColor, iconBg }: ShipStatCardProps) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
        <div>
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ShippingPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [carrierFilter, setCarrierFilter] = useState("all")

  const filtered = useMemo(
    () =>
      mockShipments.filter((s) => {
        const q = search.toLowerCase()
        const matchSearch =
          s.id.toLowerCase().includes(q) ||
          s.trackingNumber.toLowerCase().includes(q) ||
          s.destination.toLowerCase().includes(q)
        const matchStatus = statusFilter === "all" || s.status === statusFilter
        const matchCarrier = carrierFilter === "all" || s.carrier === carrierFilter
        return matchSearch && matchStatus && matchCarrier
      }),
    [search, statusFilter, carrierFilter]
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Shipping</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Track and manage all shipment requests
          </p>
        </div>
        <Button asChild>
          <Link href="/shipping/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Shipping Request
          </Link>
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <ShipStatCard
          title="Total Shipments"
          value={mockStats.totalShipments}
          icon={Package}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <ShipStatCard
          title="On Hold"
          value={mockShipments.filter((s) => s.status === "On Hold").length}
          icon={Package}
          iconColor="text-orange-600"
          iconBg="bg-orange-50"
        />
        <ShipStatCard
          title="In Transit"
          value={mockShipments.filter((s) => s.status === "In Transit").length}
          icon={Truck}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50"
        />
        <ShipStatCard
          title="Delivered"
          value={mockShipments.filter((s) => s.status === "Delivered").length}
          icon={CheckCircle2}
          iconColor="text-green-600"
          iconBg="bg-green-50"
        />
      </div>

      {/* Shipments table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Shipments{" "}
              <span className="text-muted-foreground font-normal text-sm">
                ({filtered.length})
              </span>
            </CardTitle>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mt-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID, tracking, or destination..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="New">New</SelectItem>
                <SelectItem value="On Hold">On Hold</SelectItem>
                <SelectItem value="In Transit">In Transit</SelectItem>
                <SelectItem value="Delivered">Delivered</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={carrierFilter} onValueChange={setCarrierFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Carriers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Carriers</SelectItem>
                <SelectItem value="DHL">DHL</SelectItem>
                <SelectItem value="FedEx">FedEx</SelectItem>
                <SelectItem value="UPS">UPS</SelectItem>
                <SelectItem value="Aramex">Aramex</SelectItem>
                <SelectItem value="TNT">TNT</SelectItem>
                <SelectItem value="Maersk">Maersk</SelectItem>
                <SelectItem value="USPS">USPS</SelectItem>
              </SelectContent>
            </Select>
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
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((shipment) => (
                <TableRow key={shipment.id} className="cursor-pointer">
                  <TableCell className="font-mono text-xs font-medium">{shipment.id}</TableCell>
                  <TableCell className="text-sm">{shipment.requester}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {shipment.trackingNumber.slice(0, 16)}…
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">{shipment.carrier}</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{shipment.poNumber ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {shipment.expectedDelivery}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[shipment.status]}`}
                    >
                      {shipment.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View details</DropdownMenuItem>
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive">
                          Cancel shipment
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}

              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                    No shipments match your filters
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
