"use client"

import { useEffect, useMemo, useState } from "react"
import { Search, Users, UserPlus, UserMinus, CheckCircle2, Plus } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getRequests, initializeMockData, type EngineRequest } from "@/services/engineService"
import type { HRPayload } from "@/modules/hr/hr.schema"

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  new: "bg-gray-100 text-gray-800",
  on_hold: "bg-orange-100 text-orange-800",
  completed: "bg-emerald-100 text-emerald-800",
}

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  on_hold: "On Hold",
  completed: "Completed",
}

const TYPE_COLORS: Record<string, string> = {
  onboarding: "bg-blue-50 text-blue-700 border border-blue-200",
  offboarding: "bg-purple-50 text-purple-700 border border-purple-200",
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string
  value: number
  icon: React.ElementType
  iconColor: string
  iconBg: string
}

function StatCard({ title, value, icon: Icon, iconColor, iconBg }: StatCardProps) {
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

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = "all" | "onboarding" | "offboarding"

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HRPage() {
  const [requests, setRequests] = useState<EngineRequest[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [activeTab, setActiveTab] = useState<Tab>("all")

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

  const hrRequests = useMemo(
    () => requests.filter((r) => r.module === "hr"),
    [requests]
  )

  const filtered = useMemo(() => {
    let result = hrRequests

    if (activeTab !== "all") {
      result = result.filter((r) => (r.payload as HRPayload).hrType === activeTab)
    }

    if (statusFilter !== "all") {
      result = result.filter((r) => r.status === statusFilter)
    }

    const q = search.trim().toLowerCase()
    if (q) {
      result = result.filter((r) => {
        const p = r.payload as HRPayload
        return (
          r.id.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          p.employeeName.toLowerCase().includes(q) ||
          p.employeeId.toLowerCase().includes(q) ||
          p.department.toLowerCase().includes(q)
        )
      })
    }

    return result
  }, [hrRequests, activeTab, statusFilter, search])

  const stats = useMemo(() => ({
    total: hrRequests.length,
    onboarding: hrRequests.filter((r) => (r.payload as HRPayload).hrType === "onboarding").length,
    offboarding: hrRequests.filter((r) => (r.payload as HRPayload).hrType === "offboarding").length,
    completed: hrRequests.filter((r) => r.status === "completed").length,
  }), [hrRequests])

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
            <Button className="bg-slate-900 hover:bg-slate-800 text-white">
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
                <UserMinus className="h-4 w-4 text-purple-600" />
                Offboarding Request
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Requests" value={stats.total} icon={Users} iconColor="text-slate-600" iconBg="bg-slate-50" />
        <StatCard title="Onboarding" value={stats.onboarding} icon={UserPlus} iconColor="text-blue-600" iconBg="bg-blue-50" />
        <StatCard title="Offboarding" value={stats.offboarding} icon={UserMinus} iconColor="text-purple-600" iconBg="bg-purple-50" />
        <StatCard title="Completed" value={stats.completed} icon={CheckCircle2} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
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
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${
                  activeTab === tab.key
                    ? "bg-slate-900 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {tab.label}
                <span className={`ml-2 text-xs font-normal ${activeTab === tab.key ? "text-gray-300" : "text-gray-400"}`}>
                  ({tab.key === "all"
                    ? hrRequests.length
                    : hrRequests.filter((r) => (r.payload as HRPayload).hrType === tab.key).length})
                </span>
              </button>
            ))}
          </div>

          {/* Filters */}
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

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <CardTitle className="text-sm text-muted-foreground font-normal mt-1">
            Showing {filtered.length} request{filtered.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Request ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Employee Name</TableHead>
                <TableHead>Employee ID</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((req) => {
                const p = req.payload as HRPayload
                const statusClass = STATUS_COLORS[req.status] ?? "bg-zinc-100 text-zinc-700"
                const typeClass = TYPE_COLORS[p.hrType] ?? "bg-gray-100 text-gray-700"
                const date = p.hrType === "onboarding" ? p.startDate : p.lastWorkingDay

                return (
                  <TableRow key={req.id} className="hover:bg-gray-50">
                    <TableCell className="font-mono text-xs text-muted-foreground">{req.id}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeClass}`}>
                        {p.hrType === "onboarding" ? "Onboarding" : "Offboarding"}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm font-medium">{p.employeeName}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.employeeId}</TableCell>
                    <TableCell className="text-sm">{p.department}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px]">
                      <span className="truncate block">{p.items.join(", ")}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{date}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}`}>
                        {STATUS_LABELS[req.status] ?? req.status}
                      </span>
                    </TableCell>
                  </TableRow>
                )
              })}

              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                    No HR requests found
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
