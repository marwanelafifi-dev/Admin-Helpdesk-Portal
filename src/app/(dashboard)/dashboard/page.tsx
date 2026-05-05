"use client"

import { useEffect, useMemo, useState } from "react"
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts"
import {
  FileText, Clock, CheckCircle2, AlertCircle, TrendingUp, TrendingDown,
  Package, UserCog, PauseCircle, Truck, Activity, Target, MessageSquare, Star,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getRequests, initializeMockData, type EngineRequest } from "@/services/engineService"
import { getFeedbackResponses } from "@/services/feedbackService"
import { cn } from "@/lib/utils"

const STATUS_COLORS: Record<string, string> = {
  new: "bg-sky-50 text-sky-700", on_hold: "bg-amber-50 text-amber-700",
  in_transit: "bg-amber-50 text-amber-700", delivered: "bg-green-50 text-green-700",
  completed: "bg-emerald-50 text-emerald-700", cancelled: "bg-red-50 text-red-600",
}

const STATUS_DOT: Record<string, string> = {
  new: "bg-sky-500", on_hold: "bg-amber-500", in_transit: "bg-amber-500",
  delivered: "bg-green-500", completed: "bg-emerald-500", cancelled: "bg-red-500",
}

const STATUS_LABELS: Record<string, string> = {
  new: "New", on_hold: "In Progress", in_transit: "In Customs",
  delivered: "Delivered", completed: "Completed", cancelled: "Cancelled",
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
    <Card className="border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-300 ease-out animate-in fade-in-50">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest letter-spacing-0.05">{title}</p>
            <p className="text-4xl font-bold mt-3 tracking-tight tabular-nums">{value}</p>
            {trend && (
              <div className="flex items-center gap-2 mt-3">
                <div className={cn(
                  "px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all duration-200",
                  trend.isPositive ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
                )}>
                  {trend.isPositive ? (
                    <TrendingUp className="h-3.5 w-3.5 animate-bounce" style={{ animationDuration: "2s" }} />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5" />
                  )}
                  <span className="font-mono">{trend.value}%</span>
                  <span className="opacity-75">{trend.label}</span>
                </div>
              </div>
            )}
          </div>
          <div className={`h-14 w-14 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg} transition-transform duration-300 group-hover:scale-105`}>
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

type TimeRange = "7d" | "15d" | "30d" | "90d" | "1y" | "custom"

interface DateRange {
  from: string
  to: string
}

export default function DashboardPage() {
  const [requests, setRequests] = useState<EngineRequest[]>([])
  const [timeRange, setTimeRange] = useState<TimeRange>("7d")
  const [customRange, setCustomRange] = useState<DateRange>({
    from: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    to: new Date().toISOString().split("T")[0],
  })
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false)
  const [feedbackComments, setFeedbackComments] = useState<any[]>([])

  useEffect(() => {
    initializeMockData()
    const sync = () => {
      setRequests(getRequests())
      const responses = getFeedbackResponses()
      setFeedbackComments(
        responses
          .filter((r) => r.comment && r.comment.length > 0)
          .sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime())
          .slice(0, 5)
      )
    }
    sync()
    window.addEventListener("focus", sync)
    window.addEventListener("storage", sync)
    return () => {
      window.removeEventListener("focus", sync)
      window.removeEventListener("storage", sync)
    }
  }, [])

  // Filter requests based on time range
  const getTimeRangeLabel = (range: TimeRange) => {
    const labels: Record<TimeRange, string> = {
      "7d": "Last 7 Days",
      "15d": "Last 15 Days",
      "30d": "Last Month",
      "90d": "Last Quarter",
      "1y": "Last Year",
      "custom": "Custom Range",
    }
    return labels[range]
  }

  const getDaysFromRange = (range: TimeRange): number => {
    const days: Record<TimeRange, number> = { "7d": 7, "15d": 15, "30d": 30, "90d": 90, "1y": 365, "custom": 0 }
    return days[range]
  }

  const getDateRange = (range: TimeRange): { from: Date; to: Date } => {
    const now = new Date()
    if (range === "custom") {
      return {
        from: new Date(customRange.from),
        to: new Date(customRange.to),
      }
    }
    const rangeInDays = getDaysFromRange(range)
    return {
      from: new Date(now.getTime() - rangeInDays * 24 * 60 * 60 * 1000),
      to: now,
    }
  }

  const filteredRequests = useMemo(() => {
    const { from, to } = getDateRange(timeRange)
    return requests.filter((r) => {
      const createdDate = new Date(r.createdAt)
      return createdDate >= from && createdDate <= to
    })
  }, [requests, timeRange, customRange])

  const stats = useMemo(() => {
    const statusBreakdown: Record<string, number> = {}
    const moduleBreakdown: Record<string, number> = {}
    let avgResolutionDays = 0
    let activeCount = 0

    filteredRequests.forEach((r) => {
      statusBreakdown[r.status] = (statusBreakdown[r.status] || 0) + 1
      moduleBreakdown[r.module] = (moduleBreakdown[r.module] || 0) + 1
      if (["new", "on_hold", "in_transit"].includes(r.status)) activeCount++
    })

    const completed = filteredRequests.filter((r) => r.status === "completed").length
    const delivered = filteredRequests.filter((r) => r.status === "delivered").length
    const cancelled = filteredRequests.filter((r) => r.status === "cancelled").length

    if (completed > 0) {
      avgResolutionDays = Math.round(
        filteredRequests
          .filter((r) => r.status === "completed")
          .reduce((sum, r) => sum + (new Date(r.updatedAt).getTime() - new Date(r.createdAt).getTime()), 0) /
          completed /
          (1000 * 60 * 60 * 24)
      )
    }

    const successfulRequests = completed + delivered
    const onTimeRate = filteredRequests.length > 0 ? Math.round((successfulRequests / filteredRequests.length) * 100) : 0
    const cancellationRate = filteredRequests.length > 0 ? Math.round((cancelled / filteredRequests.length) * 100) : 0

    // First Response Time (average hours from creation to first status change)
    let firstResponseHours = 0
    const requestsWithActivity = filteredRequests.filter((r) => r.createdAt !== r.updatedAt)
    if (requestsWithActivity.length > 0) {
      firstResponseHours = Math.round(
        requestsWithActivity.reduce((sum, r) => sum + (new Date(r.updatedAt).getTime() - new Date(r.createdAt).getTime()), 0) /
          requestsWithActivity.length /
          (1000 * 60 * 60)
      )
    }

    // Closure Time (average days from creation to completion)
    let closureTimeDays = 0
    const completedRequests = filteredRequests.filter((r) => ["completed", "delivered"].includes(r.status))
    if (completedRequests.length > 0) {
      closureTimeDays = Math.round(
        completedRequests.reduce((sum, r) => sum + (new Date(r.updatedAt).getTime() - new Date(r.createdAt).getTime()), 0) /
          completedRequests.length /
          (1000 * 60 * 60 * 24)
      )
    }

    return {
      total: filteredRequests.length,
      active: activeCount,
      completed: statusBreakdown["completed"] || 0,
      delivered: delivered,
      cancelled: cancelled,
      avgResolution: avgResolutionDays,
      onTimeRate,
      cancellationRate,
      successfulRequests,
      statusBreakdown,
      moduleBreakdown,
      firstResponseHours,
      closureTimeDays,
    }
  }, [filteredRequests])

  const moduleChartData = useMemo(() => {
    return ["shipping", "maintenance", "purchase", "event", "travel", "hr"].map((mod) => ({
      name: mod.charAt(0).toUpperCase() + mod.slice(1),
      value: stats.moduleBreakdown[mod] || 0,
      fill: MODULE_COLORS[mod].pie,
    }))
  }, [stats])

  const statusTrendData = useMemo(() => {
    const statuses = ["new", "on_hold", "in_transit", "delivered", "completed", "cancelled"]
    return statuses.map((status) => ({
      status: STATUS_LABELS[status],
      count: stats.statusBreakdown[status] || 0,
    }))
  }, [stats])

  const moduleBarData = useMemo(() => {
    return ["shipping", "maintenance", "purchase", "event", "travel", "hr"].map((mod) => ({
      name: mod.charAt(0).toUpperCase() + mod.slice(1),
      value: stats.moduleBreakdown[mod] || 0,
    }))
  }, [stats])

  const recentActivity = useMemo(() => {
    return [...filteredRequests]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 10)
  }, [filteredRequests])


  const overdueItems = useMemo(() => {
    const now = new Date()
    return filteredRequests.filter((r) => {
      if (["completed", "cancelled", "delivered"].includes(r.status)) return false
      const createdDate = new Date(r.createdAt)
      const daysSinceCreation = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
      return daysSinceCreation > 7
    })
  }, [filteredRequests])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b pb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Real-time overview of all requests, performance metrics, and key insights
            </p>
          </div>
        </div>

        {/* Time Range Filter */}
        <div className="flex flex-wrap gap-2 items-center">
          {(["7d", "15d", "30d", "90d", "1y"] as const).map((range) => (
            <button
              key={range}
              onClick={() => {
                setTimeRange(range)
                setShowCustomDatePicker(false)
              }}
              className={cn(
                "px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 border",
                timeRange === range && !showCustomDatePicker
                  ? "bg-blue-600 text-white border-blue-600 shadow-md"
                  : "bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              )}
            >
              {getTimeRangeLabel(range as TimeRange)}
            </button>
          ))}

          {/* Custom Range Button */}
          <button
            onClick={() => {
              setTimeRange("custom")
              setShowCustomDatePicker(!showCustomDatePicker)
            }}
            className={cn(
              "px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 border",
              timeRange === "custom" && showCustomDatePicker
                ? "bg-blue-600 text-white border-blue-600 shadow-md"
                : "bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            )}
          >
            📅 Custom
          </button>

          {/* Custom Date Picker */}
          {showCustomDatePicker && timeRange === "custom" && (
            <div className="w-full mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-gray-700 mb-1">From Date</label>
                  <input
                    type="date"
                    value={customRange.from}
                    onChange={(e) => {
                      setCustomRange({ ...customRange, from: e.target.value })
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-gray-700 mb-1">To Date</label>
                  <input
                    type="date"
                    value={customRange.to}
                    onChange={(e) => {
                      setCustomRange({ ...customRange, to: e.target.value })
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  onClick={() => {
                    setShowCustomDatePicker(false)
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
                >
                  Apply
                </button>

                <span className="text-xs text-gray-600 flex-1">
                  {filteredRequests.length} request{filteredRequests.length !== 1 ? "s" : ""} in range
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Primary KPIs */}
      <div>
        <h2 className="text-lg font-semibold mb-4 text-gray-900">Key Performance Indicators</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div>
            <KPICard
              title="Total Requests"
              value={stats.total}
              icon={FileText}
              iconColor="text-blue-600"
              iconBg="bg-blue-50"
              trend={{ value: stats.onTimeRate, label: "completion rate", isPositive: stats.onTimeRate >= 80 }}
            />
          </div>
          <div>
            <KPICard
              title="Active Requests"
              value={stats.active}
              icon={Activity}
              iconColor="text-orange-600"
              iconBg="bg-orange-50"
              trend={{ value: stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0, label: "of total", isPositive: false }}
            />
          </div>
          <div>
            <KPICard
              title="Successful Requests"
              value={stats.successfulRequests}
              icon={CheckCircle2}
              iconColor="text-emerald-600"
              iconBg="bg-emerald-50"
              trend={{ value: stats.onTimeRate, label: "success rate", isPositive: true }}
            />
          </div>
          <div>
            <KPICard
              title="Avg Resolution Time"
              value={`${stats.avgResolution}d`}
              icon={Clock}
              iconColor="text-teal-600"
              iconBg="bg-teal-50"
              trend={{ value: stats.avgResolution > 0 ? Math.max(0, 30 - stats.avgResolution) : 0, label: "days faster", isPositive: true }}
            />
          </div>
        </div>
      </div>

      {/* Recommended KPIs */}
      <div>
        <h2 className="text-lg font-semibold mb-4 text-gray-900">Performance Metrics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <KPICard
            title="First Response Time"
            value={`${stats.firstResponseHours}h`}
            icon={Truck}
            iconColor="text-blue-600"
            iconBg="bg-blue-50"
            trend={{ value: Math.max(0, 24 - stats.firstResponseHours), label: "within target", isPositive: stats.firstResponseHours <= 24 }}
          />
          <KPICard
            title="Closure Time"
            value={`${stats.closureTimeDays}d`}
            icon={Clock}
            iconColor="text-purple-600"
            iconBg="bg-purple-50"
            trend={{ value: Math.max(0, 14 - stats.closureTimeDays), label: "below avg", isPositive: stats.closureTimeDays <= 14 }}
          />
        </div>
      </div>

      {/* Secondary KPIs */}
      <div>
        <h2 className="text-lg font-semibold mb-4 text-gray-900">Request Status Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <KPICard
            title="Overdue Items"
            value={overdueItems.length}
            icon={AlertCircle}
            iconColor="text-red-600"
            iconBg="bg-red-50"
            trend={{ value: overdueItems.length > 0 ? Math.round((overdueItems.length / stats.active) * 100 || 0) : 0, label: "of active", isPositive: overdueItems.length === 0 }}
          />
          <KPICard
            title="Cancellation Rate"
            value={`${stats.cancellationRate}%`}
            icon={TrendingDown}
            iconColor="text-red-600"
            iconBg="bg-red-50"
            trend={{ value: Math.max(0, 10 - stats.cancellationRate), label: "below target", isPositive: true }}
          />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Request Status Breakdown */}
        <Card className="xl:col-span-2 border border-gray-100 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Package className="h-5 w-5 text-blue-600" /> Request Status Distribution
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Current breakdown by status across all requests</p>
          </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={statusTrendData} margin={{ top: 20, right: 30, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="status" tick={{ fontSize: 12, fill: "#64748b", fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
                      backgroundColor: "#ffffff",
                      padding: "12px 16px"
                    }}
                    cursor={{ fill: "rgba(59, 130, 246, 0.08)" }}
                    formatter={(value) => [`${value} requests`, "Count"]}
                  />
                  <Bar dataKey="count" radius={[10, 10, 0, 0]} fill="#3b82f6" animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Module Distribution */}
          <Card className="border border-gray-100 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Target className="h-5 w-5 text-teal-600" /> Requests by Module
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Distribution of requests across all business modules</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={moduleChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    innerRadius={40}
                    fill="#8884d8"
                    dataKey="value"
                    animationDuration={800}
                  >
                    {moduleChartData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.fill} opacity={0.85} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
                      backgroundColor: "#ffffff",
                      padding: "12px 16px"
                    }}
                    formatter={(value) => [`${value} requests`, "Total"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Section */}
      <div>
        <h2 className="text-lg font-semibold mb-4 text-gray-900">Activity & Alerts</h2>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <Card className="xl:col-span-2 border border-gray-100 shadow-sm">
            <CardHeader className="pb-4 border-b border-gray-100">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Activity className="h-5 w-5 text-blue-600" /> Recent Activity
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">{recentActivity.length} most recent updates</p>
            </CardHeader>
          <CardContent className="space-y-0 max-h-96 overflow-y-auto">
            {recentActivity.length > 0 ? (
              recentActivity.map((req, idx) => (
                <div key={req.id} className={cn("flex items-start gap-3 p-3 hover:bg-gray-50 transition-colors duration-150 rounded-lg", idx !== recentActivity.length - 1 && "border-b border-gray-100")}>
                  <span className={cn("h-3 w-3 rounded-full mt-1.5 flex-shrink-0 ring-2 ring-white", STATUS_DOT[req.status] ?? "bg-gray-400")} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{req.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{req.id} • {req.module.toUpperCase()}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border transition-all", STATUS_COLORS[req.status], "border-opacity-30")}>
                      {STATUS_LABELS[req.status]}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">{timeAgo(req.updatedAt)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <p className="text-sm">No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>

          {/* Alerts & Warnings */}
          <Card className="border border-gray-100 shadow-sm">
            <CardHeader className="pb-4 border-b border-gray-100">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <AlertCircle className="h-5 w-5 text-amber-600" /> Alerts & Warnings
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Real-time system status</p>
            </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {overdueItems.length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg hover:border-red-300 transition-colors duration-200 animate-in fade-in-50">
                <div className="flex items-start gap-3">
                  <span className="h-2 w-2 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></span>
                  <div className="flex-1">
                    <p className="font-semibold text-red-900 text-sm">{overdueItems.length} Overdue Items</p>
                    <p className="text-xs text-red-700 mt-1">Requests pending for 7+ days require attention</p>
                  </div>
                </div>
              </div>
            )}
            {stats.cancellationRate > 10 && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg hover:border-orange-300 transition-colors duration-200 animate-in fade-in-50">
                <div className="flex items-start gap-3">
                  <span className="h-2 w-2 bg-orange-500 rounded-full mt-1.5 flex-shrink-0"></span>
                  <div className="flex-1">
                    <p className="font-semibold text-orange-900 text-sm">High Cancellation Rate</p>
                    <p className="text-xs text-orange-700 mt-1">{stats.cancellationRate}% ({stats.cancelled} of {stats.total}) exceeds target threshold</p>
                  </div>
                </div>
              </div>
            )}
            {overdueItems.length === 0 && stats.cancellationRate <= 10 && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg hover:border-emerald-300 transition-colors duration-200">
                <div className="flex items-start gap-3">
                  <span className="h-2 w-2 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0 animate-pulse"></span>
                  <div className="flex-1">
                    <p className="font-semibold text-emerald-900 text-sm">System Healthy</p>
                    <p className="text-xs text-emerald-700 mt-1">All metrics within acceptable parameters</p>
                  </div>
                </div>
              </div>
            )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Employee Feedback */}
      <div>
        <h2 className="text-lg font-semibold mb-4 text-gray-900">Employee Request Feedback</h2>
        <Card className="border border-gray-100 shadow-sm">
          <CardHeader className="pb-4 border-b border-gray-100">
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <MessageSquare className="h-5 w-5 text-purple-600" /> Service Quality Ratings
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">{feedbackComments.length} recent satisfaction responses</p>
          </CardHeader>
          <CardContent className="pt-4">
            {feedbackComments.length > 0 ? (
              <div className="space-y-0 max-h-96 overflow-y-auto">
                {feedbackComments.map((comment, idx) => (
                  <div key={`${comment.requestId}-${comment.completedAt}`} className={cn("p-4 hover:bg-gray-50 transition-colors duration-150 rounded-lg", idx !== feedbackComments.length - 1 && "border-b border-gray-100")}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900">{comment.requestId}</p>
                          <span className="text-xs text-gray-500">•</span>
                          <p className="text-xs text-gray-600 font-medium">{comment.requestTitle}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">From {comment.requesterName}</p>
                      </div>
                      <div className="flex gap-0.5 flex-shrink-0">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "h-3.5 w-3.5",
                              i < (comment.rating || 0) ? "fill-amber-400 text-amber-400" : "text-gray-200"
                            )}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 bg-blue-50 rounded px-3 py-2 border-l-2 border-blue-300 italic">"{comment.comment}"</p>
                    <p className="text-xs text-gray-400 mt-2">{timeAgo(comment.completedAt || comment.createdAt)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-600">No feedback responses yet</p>
                <p className="text-xs text-gray-500 mt-1">Employee satisfaction ratings will appear here after completing request surveys</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
