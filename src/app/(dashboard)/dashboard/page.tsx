"use client"

import { useEffect, useMemo, useState } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import {
  FileText,
  Clock,
  CheckCircle2,
  TrendingUp,
  Package,
  UserCog,
  PauseCircle,
  Truck,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getRequests, initializeMockData, type EngineRequest } from "@/services/engineService"

// ─── Status badge colors ──────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  new: "bg-gray-100 text-gray-800",
  on_hold: "bg-orange-100 text-orange-800",
  in_transit: "bg-blue-100 text-blue-800",
  delivered: "bg-green-100 text-green-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
  draft: "bg-zinc-100 text-zinc-700",
}

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  on_hold: "On Hold",
  in_transit: "In Transit",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
  draft: "Draft",
}

const MODULE_BAR_COLORS: Record<string, string> = {
  Shipping: "#3b82f6",
  Maintenance: "#a855f7",
  Purchase: "#22c55e",
  Event: "#f97316",
  Travel: "#ec4899",
  HR: "#14b8a6",
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string
  value: number
  icon: React.ElementType
  iconColor: string
  iconBg: string
  change?: string
}

function StatCard({ title, value, icon: Icon, iconColor, iconBg, change }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            {change && <p className="text-xs text-muted-foreground mt-1">{change}</p>}
          </div>
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${iconBg}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [requests, setRequests] = useState<EngineRequest[]>([])

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

  // ── Aggregated stats ────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: requests.length,
    new: requests.filter((r) => r.status === "new").length,
    onHold: requests.filter((r) => r.status === "on_hold").length,
    inTransit: requests.filter((r) => r.status === "in_transit").length,
    delivered: requests.filter((r) => r.status === "delivered").length,
    completed: requests.filter((r) => r.status === "completed").length,
    cancelled: requests.filter((r) => r.status === "cancelled").length,
    draft: requests.filter((r) => r.status === "draft").length,
    // HR
    hrTotal: requests.filter((r) => r.module === "hr").length,
    hrOnboarding: requests.filter((r) => r.module === "hr" && (r.payload as any).hrType === "onboarding").length,
    hrOffboarding: requests.filter((r) => r.module === "hr" && (r.payload as any).hrType === "offboarding").length,
    // Shipping
    shipping: requests.filter((r) => r.module === "shipping").length,
    shippingInTransit: requests.filter((r) => r.module === "shipping" && r.status === "in_transit").length,
    shippingDelivered: requests.filter((r) => r.module === "shipping" && r.status === "delivered").length,
  }), [requests])

  // ── Bar chart data ──────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    const modules = ["shipping", "maintenance", "purchase", "event", "travel", "hr"]
    const labels: Record<string, string> = {
      shipping: "Shipping", maintenance: "Maintenance", purchase: "Purchase",
      event: "Event", travel: "Travel", hr: "HR",
    }
    return modules.map((mod) => ({
      module: labels[mod],
      count: requests.filter((r) => r.module === mod).length,
    }))
  }, [requests])

  // ── Recent activity (last 8 by updatedAt) ──────────────────────────────────
  const recentActivity = useMemo(() => {
    return [...requests]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 8)
  }, [requests])

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "Just now"
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  function moduleLabel(mod: string) {
    return mod.charAt(0).toUpperCase() + mod.slice(1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Live overview of all requests and activities
        </p>
      </div>

      {/* Primary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Requests" value={stats.total} icon={FileText}
          iconColor="text-blue-600" iconBg="bg-blue-50" change="All modules" />
        <StatCard title="New" value={stats.new} icon={Clock}
          iconColor="text-gray-600" iconBg="bg-gray-100" change="Awaiting action" />
        <StatCard title="On Hold" value={stats.onHold} icon={PauseCircle}
          iconColor="text-orange-600" iconBg="bg-orange-50" change="Blocked / pending input" />
        <StatCard title="In Transit" value={stats.inTransit} icon={Truck}
          iconColor="text-blue-600" iconBg="bg-blue-50" change="Being processed" />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Delivered" value={stats.delivered} icon={Package}
          iconColor="text-green-600" iconBg="bg-green-50" change="Delivered to requester" />
        <StatCard title="Completed" value={stats.completed} icon={CheckCircle2}
          iconColor="text-emerald-600" iconBg="bg-emerald-50" change="Fully closed" />
        <StatCard title="HR Requests" value={stats.hrTotal} icon={UserCog}
          iconColor="text-teal-600" iconBg="bg-teal-50"
          change={`${stats.hrOnboarding} onboarding · ${stats.hrOffboarding} offboarding`} />
        <StatCard title="Active Shipments" value={stats.shippingInTransit} icon={TrendingUp}
          iconColor="text-indigo-600" iconBg="bg-indigo-50"
          change={`${stats.shippingDelivered} delivered`} />
      </div>

      {/* Chart + Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Bar chart */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Requests by Module</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="module"
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={56}>
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.module}
                      fill={MODULE_BAR_COLORS[entry.module] ?? "#94a3b8"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivity.length === 0 && (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            )}
            {recentActivity.map((req) => {
              const statusClass = STATUS_COLORS[req.status] ?? "bg-gray-100 text-gray-700"
              return (
                <div key={req.id} className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{req.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {moduleLabel(req.module)} · {timeAgo(req.updatedAt)}
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${statusClass}`}>
                    {STATUS_LABELS[req.status] ?? req.status}
                  </span>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
