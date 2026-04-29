"use client"

import { useEffect, useMemo, useState } from "react"
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts"
import {
  FileText, Clock, CheckCircle2, AlertCircle, TrendingUp, TrendingDown,
  Package, UserCog, PauseCircle, Truck, Activity, Target,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getRequests, initializeMockData, type EngineRequest } from "@/services/engineService"
import { cn } from "@/lib/utils"

const STATUS_COLORS: Record<string, string> = {
  new: "bg-sky-50 text-sky-700", on_hold: "bg-amber-50 text-amber-700",
  in_transit: "bg-amber-50 text-amber-700", delivered: "bg-green-50 text-green-700",
  completed: "bg-emerald-50 text-emerald-700", cancelled: "bg-red-50 text-red-600",
  draft: "bg-zinc-100 text-zinc-700",
}

const STATUS_DOT: Record<string, string> = {
  new: "bg-sky-500", on_hold: "bg-amber-500", in_transit: "bg-amber-500",
  delivered: "bg-green-500", completed: "bg-emerald-500", cancelled: "bg-red-500",
  draft: "bg-zinc-400",
}

const STATUS_LABELS: Record<string, string> = {
  new: "New", on_hold: "In Progress", in_transit: "In Customs",
  delivered: "Delivered", completed: "Completed", cancelled: "Cancelled", draft: "Draft",
}

const MODULE_COLORS: Record<string, { bar: string; pie: string }> = {
  shipping: { bar: "#3b82f6", pie: "#3b82f6" },
  maintenance: { bar: "#a855f7", pie: "#a855f7" },
  purchase: { bar: "#22c55e", pie: "#22c55e" },
  event: { bar: "#f97316", pie: "#f97316" },
  travel: { bar: "#ec4899", pie: "#ec4899" },
  hr: { bar: "#14b8a6", pie: "#14b8a6" },
}

interface KPICardProps {
  title: string; value: number | string; icon: React.ElementType;
  iconColor: string; iconBg: string; trend?: { value: number; label: string; isPositive: boolean }
}

function KPICard({ title, value, icon: Icon, iconColor, iconBg, trend }: KPICardProps) {
  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</p>
            <p className="text-4xl font-bold mt-3 tracking-tight">{value}</p>
            {trend && (
              <div className="flex items-center gap-2 mt-3">
                <div className={cn("px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1", trend.isPositive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700")}>
                  {trend.isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>{trend.value}% {trend.label}</span>
                </div>
              </div>
            )}
          </div>
          <div className={`h-14 w-14 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
            <Icon className={`h-6 w-6 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

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

  const stats = useMemo(() => {
    const statusBreakdown: Record<string, number> = {}
    const moduleBreakdown: Record<string, number> = {}
    let avgResolutionDays = 0
    let activeCount = 0

    requests.forEach((r) => {
      statusBreakdown[r.status] = (statusBreakdown[r.status] || 0) + 1
      moduleBreakdown[r.module] = (moduleBreakdown[r.module] || 0) + 1
      if (["new", "on_hold", "in_transit"].includes(r.status)) activeCount++
    })

    const completed = requests.filter((r) => r.status === "completed").length
    if (completed > 0) {
      avgResolutionDays = Math.round(
        requests
          .filter((r) => r.status === "completed")
          .reduce((sum, r) => sum + (new Date(r.updatedAt).getTime() - new Date(r.createdAt).getTime()), 0) /
          completed /
          (1000 * 60 * 60 * 24)
      )
    }

    return {
      total: requests.length,
      active: activeCount,
      completed: statusBreakdown["completed"] || 0,
      cancelled: statusBreakdown["cancelled"] || 0,
      avgResolution: avgResolutionDays,
      onTimeRate: requests.length > 0 ? Math.round((completed / requests.length) * 100) : 0,
      statusBreakdown,
      moduleBreakdown,
    }
  }, [requests])

  const moduleChartData = useMemo(() => {
    return ["shipping", "maintenance", "purchase", "event", "travel", "hr"].map((mod) => ({
      name: mod.charAt(0).toUpperCase() + mod.slice(1),
      value: stats.moduleBreakdown[mod] || 0,
      fill: MODULE_COLORS[mod].pie,
    }))
  }, [stats])

  const statusTrendData = useMemo(() => {
    const statuses = ["draft", "new", "on_hold", "in_transit", "delivered", "completed", "cancelled"]
    return statuses.map((status) => ({
      status: STATUS_LABELS[status],
      count: stats.statusBreakdown[status] || 0,
    }))
  }, [stats])

  const recentActivity = useMemo(() => {
    return [...requests]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 10)
  }, [requests])

  const pendingApprovals = useMemo(() => {
    return requests.filter((r) => r.status === "new" || r.status === "on_hold")
  }, [requests])

  const overdueItems = useMemo(() => {
    const now = new Date()
    return requests.filter((r) => {
      if (["completed", "cancelled", "delivered"].includes(r.status)) return false
      const createdDate = new Date(r.createdAt)
      const daysSinceCreation = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
      return daysSinceCreation > 7
    })
  }, [requests])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b pb-6">
        <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Real-time overview of all requests, performance metrics, and key insights
        </p>
      </div>

      {/* Primary KPIs */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Key Performance Indicators</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          title="Total Requests"
          value={stats.total}
          icon={FileText}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
          trend={{ value: stats.onTimeRate, label: "on-time completion", isPositive: true }}
        />
        <KPICard
          title="Active Requests"
          value={stats.active}
          icon={Activity}
          iconColor="text-orange-600"
          iconBg="bg-orange-50"
          trend={{ value: Math.round((stats.active / stats.total) * 100), label: "of total", isPositive: false }}
        />
        <KPICard
          title="Completed"
          value={stats.completed}
          icon={CheckCircle2}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
          trend={{ value: 8, label: "this week", isPositive: true }}
        />
        <KPICard
          title="Avg Resolution"
          value={`${stats.avgResolution}d`}
          icon={Clock}
          iconColor="text-teal-600"
          iconBg="bg-teal-50"
          trend={{ value: 12, label: "vs last month", isPositive: true }}
        />
        </div>
      </div>

      {/* Secondary KPIs */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Request Status Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard
          title="Pending Approvals"
          value={pendingApprovals.length}
          icon={Clock}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
          trend={{ value: pendingApprovals.filter((r) => r.status === "new").length, label: "new", isPositive: false }}
        />
        <KPICard
          title="Overdue Items"
          value={overdueItems.length}
          icon={AlertCircle}
          iconColor="text-red-600"
          iconBg="bg-red-50"
        />
        <KPICard
          title="Cancellation Rate"
          value={`${stats.total > 0 ? Math.round((stats.cancelled / stats.total) * 100) : 0}%`}
          icon={TrendingDown}
          iconColor="text-red-600"
          iconBg="bg-red-50"
          trend={{ value: 2, label: "lower than Q1", isPositive: true }}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Requests by Module */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" /> Requests by Module
            </CardTitle>
          </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={statusTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="status" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                      backgroundColor: "#ffffff"
                    }}
                    cursor={{ fill: "rgba(59, 130, 246, 0.05)" }}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Module Distribution */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-5 w-5" /> Module Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={moduleChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {moduleChartData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                      backgroundColor: "#ffffff"
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Section */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Activity & Alerts</h2>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <Card className="xl:col-span-2 border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-5 w-5" /> Recent Activity
              </CardTitle>
            </CardHeader>
          <CardContent className="space-y-3">
            {recentActivity.map((req) => (
              <div key={req.id} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                <span className={cn("h-2.5 w-2.5 rounded-full mt-1.5 flex-shrink-0", STATUS_DOT[req.status] ?? "bg-gray-400")} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{req.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{req.id}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold", STATUS_COLORS[req.status])}>
                    {STATUS_LABELS[req.status]}
                  </span>
                  <span className="text-xs text-muted-foreground">{timeAgo(req.updatedAt)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

          {/* Alerts & Warnings */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertCircle className="h-5 w-5" /> Alerts & Warnings
              </CardTitle>
            </CardHeader>
          <CardContent className="space-y-3">
            {overdueItems.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="font-medium text-red-900 text-sm">{overdueItems.length} Overdue Items</p>
                <p className="text-xs text-red-700 mt-1">Requests pending for more than 7 days</p>
              </div>
            )}
            {pendingApprovals.length > 5 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="font-medium text-amber-900 text-sm">{pendingApprovals.length} Pending Approvals</p>
                <p className="text-xs text-amber-700 mt-1">Requests awaiting review or approval</p>
              </div>
            )}
            {stats.cancelled > stats.completed * 0.1 && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="font-medium text-orange-900 text-sm">High Cancellation Rate</p>
                <p className="text-xs text-orange-700 mt-1">{stats.cancelled} cancelled out of {stats.total} total</p>
              </div>
            )}
            {pendingApprovals.length === 0 && overdueItems.length === 0 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="font-medium text-green-900 text-sm">All Clear</p>
                <p className="text-xs text-green-700 mt-1">No critical alerts at this time</p>
              </div>
            )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
