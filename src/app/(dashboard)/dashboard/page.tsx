"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"
import {
  FileText, Clock, CheckCircle2, AlertCircle, TrendingUp, TrendingDown, Minus,
  Activity, Star, Layers, ArrowRight,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getRequests, initializeMockData, type EngineRequest } from "@/services/engineService"
import { useNewRequestsAndTasks } from "@/hooks/useNewRequestsAndTasks"
import { NewItemsAlert } from "@/components/ui/NewItemsAlert"
import { useCountUp } from "@/hooks/useCountUp"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  new:               "bg-sky-50 text-sky-700",
  in_progress:       "bg-blue-50 text-blue-700",
  on_hold:           "bg-blue-50 text-blue-700", // legacy alias
  in_customs:        "bg-amber-50 text-amber-700",
  awaiting_approval: "bg-amber-50 text-amber-700",
  delivered:         "bg-green-50 text-green-700",
  completed:         "bg-emerald-50 text-emerald-700",
  cancelled:         "bg-red-50 text-red-600",
}

const STATUS_DOT: Record<string, string> = {
  new:               "bg-sky-500",
  in_progress:       "bg-blue-500",
  on_hold:           "bg-blue-500",
  in_customs:        "bg-amber-500",
  awaiting_approval: "bg-amber-500",
  delivered:         "bg-green-500",
  completed:         "bg-emerald-500",
  cancelled:         "bg-red-500",
}

const STATUS_LABELS: Record<string, string> = {
  new:               "New",
  in_progress:       "In Progress",
  on_hold:           "In Progress", // legacy
  in_customs:        "In Customs",
  awaiting_approval: "Awaiting Approval",
  delivered:         "Delivered",
  completed:         "Completed",
  cancelled:         "Cancelled",
}

const MODULE_COLORS: Record<string, string> = {
  shipping: "#3b82f6",
  maintenance: "#a855f7",
  purchase: "#22c55e",
  event: "#f97316",
  travel: "#ec4899",
  hr: "#14b8a6",
  general: "#6366f1",
}

const MODULES = ["shipping", "maintenance", "purchase", "event", "travel", "hr", "general"] as const

const ACTIVE_STATUSES = new Set(["new", "in_progress", "on_hold", "in_customs", "awaiting_approval"])
const COMPLETED_STATUSES = new Set(["completed", "delivered"])

type TimeRange = "7d" | "15d" | "30d" | "90d" | "1y" | "custom"

interface DateRange { from: string; to: string }

const RANGE_DAYS: Record<Exclude<TimeRange, "custom">, number> = {
  "7d": 7, "15d": 15, "30d": 30, "90d": 90, "1y": 365,
}

const RANGE_LABELS: Record<TimeRange, string> = {
  "7d": "Last 7 Days",
  "15d": "Last 15 Days",
  "30d": "Last 30 Days",
  "90d": "Last Quarter",
  "1y": "Last Year",
  "custom": "Custom Range",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function daysBetween(from: Date, to: Date) {
  return Math.max(0, (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
}

function avgDaysToCompletion(reqs: EngineRequest[]): number {
  const closed = reqs.filter((r) => COMPLETED_STATUSES.has(r.status))
  if (closed.length === 0) return 0
  const total = closed.reduce((sum, r) => sum + daysBetween(new Date(r.createdAt), new Date(r.updatedAt)), 0)
  return Math.round((total / closed.length) * 10) / 10
}

function pct(part: number, whole: number): number {
  if (whole === 0) return 0
  return Math.round((part / whole) * 100)
}

// Percent change vs prior period. Returns null if prior had zero (no baseline).
function delta(current: number, prior: number): number | null {
  if (prior === 0) return null
  return Math.round(((current - prior) / prior) * 100)
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KPICardProps {
  title: string
  /** Numeric value to animate. If `null`/`undefined`, falls back to `display` text. */
  numericValue?: number | null
  /** Optional suffix appended after the animated number (e.g. "d", "%", "★"). */
  suffix?: string
  /** Display fallback if numericValue is not provided or shouldn't animate. */
  display?: string
  icon: React.ElementType
  iconColor: string
  iconBg: string
  /** Delta vs prior period. null = no baseline (e.g. prior was 0). */
  deltaPct: number | null
  /** True if a positive change (i.e. growth) is GOOD. False for metrics where lower is better (Overdue, Avg Days, Cancellation). */
  higherIsBetter: boolean
  subtitle?: string
  /** Stagger index — multiplies a small base delay so the row fans in instead of popping all at once. */
  index?: number
}

function KPICard({ title, numericValue, suffix, display, icon: Icon, iconColor, iconBg, deltaPct, higherIsBetter, subtitle, index = 0 }: KPICardProps) {
  // Hook always runs (rules of hooks); animate value only used if numeric.
  const animated = useCountUp(typeof numericValue === "number" ? numericValue : 0, 700)
  const hasNumeric = typeof numericValue === "number" && Number.isFinite(numericValue)

  // Color & icon for the delta badge
  let badge: { icon: React.ElementType; cls: string; text: string }
  if (deltaPct === null) {
    badge = { icon: Minus, cls: "bg-gray-50 text-gray-500 border-gray-200", text: "no prior data" }
  } else if (deltaPct === 0) {
    badge = { icon: Minus, cls: "bg-gray-50 text-gray-600 border-gray-200", text: "no change" }
  } else {
    const positive = deltaPct > 0
    const good = positive === higherIsBetter
    badge = {
      icon: positive ? TrendingUp : TrendingDown,
      cls: good
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : "bg-red-50 text-red-700 border-red-200",
      text: `${positive ? "+" : ""}${deltaPct}% vs prior`,
    }
  }
  const BadgeIcon = badge.icon

  return (
    <Card
      className="border border-gray-100 shadow-sm hover:shadow-lg hover:border-gray-200 hover:-translate-y-0.5 transition-all duration-300 ease-out animate-in fade-in slide-in-from-bottom-2"
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: "backwards" }}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{title}</p>
            <p className="text-3xl xl:text-4xl font-bold mt-3 tracking-tight tabular-nums">
              {hasNumeric
                ? <>{Number.isInteger(numericValue) ? Math.round(animated).toLocaleString() : animated.toFixed(1)}{suffix ?? ""}</>
                : (display ?? "—")}
            </p>
            {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
            <div className="mt-3 flex">
              <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors", badge.cls)}>
                <BadgeIcon className="h-3.5 w-3.5" />
                {badge.text}
              </span>
            </div>
          </div>
          <div className={cn("h-14 w-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-105", iconBg)}>
            <Icon className={cn("h-6 w-6", iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const chartAxisColor = isDark ? "#94a3b8" : "#64748b"
  const chartGridColor = isDark ? "#334155" : "#f1f5f9"
  const chartTooltipBg = isDark ? "#1e293b" : "#ffffff"
  const chartTooltipBorder = isDark ? "#334155" : "#e2e8f0"

  const [requests, setRequests] = useState<EngineRequest[]>([])
  const [timeRange, setTimeRange] = useState<TimeRange>("30d")
  const [customRange, setCustomRange] = useState<DateRange>(() => {
    const now = new Date()
    const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    return { from: from.toISOString().split("T")[0], to: now.toISOString().split("T")[0] }
  })
  const [feedback, setFeedback] = useState<any[]>([])
  const { newRequestsCount, newTasksCount } = useNewRequestsAndTasks()

  // Load requests + feedback responses
  useEffect(() => {
    initializeMockData()
    const sync = async () => {
      setRequests(getRequests())
      try {
        const res = await fetch("/api/feedback/responses")
        if (res.ok) {
          const data = await res.json()
          setFeedback(Array.isArray(data.responses) ? data.responses : [])
        }
      } catch { /* feedback is best-effort */ }
    }
    sync()
    window.addEventListener("focus", sync)
    window.addEventListener("storage", sync)
    window.addEventListener("arp:storage", sync)
    return () => {
      window.removeEventListener("focus", sync)
      window.removeEventListener("storage", sync)
      window.removeEventListener("arp:storage", sync)
    }
  }, [])

  // Compute current and prior date windows for comparison
  const { current, prior } = useMemo(() => {
    const now = new Date()
    let from: Date, to: Date, priorFrom: Date, priorTo: Date

    if (timeRange === "custom") {
      from = new Date(customRange.from)
      to = new Date(customRange.to)
      const spanMs = to.getTime() - from.getTime()
      priorTo = new Date(from.getTime() - 1)
      priorFrom = new Date(priorTo.getTime() - spanMs)
    } else {
      const days = RANGE_DAYS[timeRange]
      to = now
      from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
      priorTo = new Date(from.getTime() - 1)
      priorFrom = new Date(priorTo.getTime() - days * 24 * 60 * 60 * 1000)
    }
    return { current: { from, to }, prior: { from: priorFrom, to: priorTo } }
  }, [timeRange, customRange])

  const currentRequests = useMemo(() => {
    return requests.filter((r) => {
      const d = new Date(r.createdAt)
      return d >= current.from && d <= current.to
    })
  }, [requests, current])

  const priorRequests = useMemo(() => {
    return requests.filter((r) => {
      const d = new Date(r.createdAt)
      return d >= prior.from && d <= prior.to
    })
  }, [requests, prior])

  // ── Aggregations ───────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const active = currentRequests.filter((r) => ACTIVE_STATUSES.has(r.status)).length
    const completed = currentRequests.filter((r) => COMPLETED_STATUSES.has(r.status)).length
    const cancelled = currentRequests.filter((r) => r.status === "cancelled").length
    const total = currentRequests.length

    // Overdue: still active AND created > 7 days ago
    const now = Date.now()
    const overdue = currentRequests.filter((r) =>
      ACTIVE_STATUSES.has(r.status) && (now - new Date(r.createdAt).getTime()) > 7 * 24 * 60 * 60 * 1000
    ).length

    const completionRate = pct(completed, total)
    const cancellationRate = pct(cancelled, total)
    const avgDays = avgDaysToCompletion(currentRequests)

    // Status breakdown for the chart
    const statusBreakdown: Record<string, number> = {}
    currentRequests.forEach((r) => {
      statusBreakdown[r.status] = (statusBreakdown[r.status] || 0) + 1
    })

    return { total, active, completed, cancelled, overdue, completionRate, cancellationRate, avgDays, statusBreakdown }
  }, [currentRequests])

  const priorStats = useMemo(() => {
    const active = priorRequests.filter((r) => ACTIVE_STATUSES.has(r.status)).length
    const completed = priorRequests.filter((r) => COMPLETED_STATUSES.has(r.status)).length
    const total = priorRequests.length
    const now = Date.now()
    const overdue = priorRequests.filter((r) =>
      ACTIVE_STATUSES.has(r.status) && (now - new Date(r.createdAt).getTime()) > 7 * 24 * 60 * 60 * 1000
    ).length
    const avgDays = avgDaysToCompletion(priorRequests)
    return { total, active, completed, overdue, avgDays }
  }, [priorRequests])

  // Module workload — per module, in current window
  const moduleWorkload = useMemo(() => {
    const now = Date.now()
    return MODULES.map((mod) => {
      const reqs = currentRequests.filter((r) => r.module === mod)
      const active = reqs.filter((r) => ACTIVE_STATUSES.has(r.status)).length
      const completed = reqs.filter((r) => COMPLETED_STATUSES.has(r.status)).length
      const overdue = reqs.filter((r) =>
        ACTIVE_STATUSES.has(r.status) && (now - new Date(r.createdAt).getTime()) > 7 * 24 * 60 * 60 * 1000
      ).length
      const avgDays = avgDaysToCompletion(reqs)
      return {
        module: mod,
        label: mod.charAt(0).toUpperCase() + mod.slice(1),
        total: reqs.length,
        active,
        completed,
        overdue,
        avgDays,
      }
    })
  }, [currentRequests])

  // Top 5 oldest open requests (across full request set, not date-filtered —
  // the oldest backlog matters regardless of when it was filed)
  const oldestOpen = useMemo(() => {
    const now = Date.now()
    return requests
      .filter((r) => ACTIVE_STATUSES.has(r.status))
      .map((r) => ({
        ...r,
        ageDays: Math.floor((now - new Date(r.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
      }))
      .sort((a, b) => b.ageDays - a.ageDays)
      .slice(0, 5)
  }, [requests])

  // Recent activity (latest 8 updates in current window)
  const recentActivity = useMemo(() => {
    return [...currentRequests]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 8)
  }, [currentRequests])

  // Feedback summary
  const feedbackStats = useMemo(() => {
    if (feedback.length === 0) return { count: 0, avg: 0, csat: 0, recent: [] as any[] }
    const ratings = feedback.map((f) => Number(f.rating) || 0).filter((n) => n > 0)
    const avg = ratings.length > 0 ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : 0
    const csat = ratings.length > 0 ? pct(ratings.filter((r) => r >= 4).length, ratings.length) : 0
    const recent = [...feedback]
      .sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime())
      .slice(0, 4)
    return { count: feedback.length, avg, csat, recent }
  }, [feedback])

  // Chart data
  const statusChartData = useMemo(() => {
    const order = ["new", "in_progress", "on_hold", "in_customs", "awaiting_approval", "delivered", "completed", "cancelled"]
    return order
      .filter((s) => (stats.statusBreakdown[s] || 0) > 0)
      .map((s) => ({ status: STATUS_LABELS[s], count: stats.statusBreakdown[s] || 0 }))
  }, [stats])

  const modulePieData = useMemo(() => {
    return moduleWorkload
      .filter((m) => m.total > 0)
      .map((m) => ({ name: m.label, value: m.total, fill: MODULE_COLORS[m.module] }))
  }, [moduleWorkload])

  // ── Render ─────────────────────────────────────────────────────────────────

  const rangeLabel = RANGE_LABELS[timeRange]
  const hasData = stats.total > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b pb-5">
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {rangeLabel} • {stats.total} request{stats.total !== 1 ? "s" : ""} in range
            {priorStats.total > 0 && (
              <span className="text-gray-400"> &nbsp;·&nbsp; comparing against the prior equivalent period ({priorStats.total} request{priorStats.total !== 1 ? "s" : ""})</span>
            )}
          </p>
        </div>
        {(newRequestsCount > 0 || newTasksCount > 0) && (
          <NewItemsAlert requestsCount={newRequestsCount} tasksCount={newTasksCount} variant="icon" />
        )}
      </div>

      {/* Time Range Filter */}
      <div className="flex flex-wrap gap-2 items-center">
        {(["7d", "15d", "30d", "90d", "1y"] as const).map((range) => (
          <button
            key={range}
            type="button"
            onClick={() => setTimeRange(range)}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-all",
              timeRange === range
                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                : "bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            )}
          >
            {RANGE_LABELS[range]}
          </button>
        ))}
        <div className="flex items-center gap-2 ml-2">
          <input
            type="date"
            value={customRange.from}
            onChange={(e) => { setCustomRange({ ...customRange, from: e.target.value }); setTimeRange("custom") }}
            className="px-2 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date"
            value={customRange.to}
            onChange={(e) => { setCustomRange({ ...customRange, to: e.target.value }); setTimeRange("custom") }}
            className="px-2 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Hero KPIs — period-over-period */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          index={0}
          title="Active Requests"
          numericValue={stats.active}
          subtitle="Open right now"
          icon={Activity}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
          deltaPct={delta(stats.active, priorStats.active)}
          higherIsBetter={false}
        />
        <KPICard
          index={1}
          title="Overdue (7d+)"
          numericValue={stats.overdue}
          subtitle="Active for over 7 days"
          icon={AlertCircle}
          iconColor="text-red-600"
          iconBg="bg-red-50"
          deltaPct={delta(stats.overdue, priorStats.overdue)}
          higherIsBetter={false}
        />
        <KPICard
          index={2}
          title="Avg Resolution"
          numericValue={stats.avgDays > 0 ? stats.avgDays : null}
          suffix="d"
          display="—"
          subtitle="Days from open to close"
          icon={Clock}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
          deltaPct={delta(stats.avgDays, priorStats.avgDays)}
          higherIsBetter={false}
        />
        <KPICard
          index={3}
          title="Satisfaction"
          numericValue={feedbackStats.count > 0 ? feedbackStats.avg : null}
          suffix=" ★"
          display="—"
          subtitle={feedbackStats.count > 0 ? `${feedbackStats.csat}% rated 4★+` : "No responses yet"}
          icon={Star}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
          deltaPct={null}
          higherIsBetter={true}
        />
      </div>

      {/* Secondary KPI strip — totals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SecondaryStat index={0} label="Total in Period"   numericValue={stats.total}            tone="blue"    icon={FileText} />
        <SecondaryStat index={1} label="Completed"          numericValue={stats.completed}        tone="emerald" icon={CheckCircle2} />
        <SecondaryStat index={2} label="Cancelled"          numericValue={stats.cancelled}        tone="red"     icon={AlertCircle} />
        <SecondaryStat index={3} label="Completion Rate"    numericValue={stats.completionRate} suffix="%" tone="purple" icon={TrendingUp} />
      </div>

      {/* Charts: Status distribution + Module pie */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card
          className="xl:col-span-2 border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out"
          style={{ animationDelay: "240ms", animationFillMode: "backwards" }}
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-gray-900">
              <Layers className="h-4 w-4 text-blue-600" /> Status Distribution
            </CardTitle>
            <p className="text-xs text-muted-foreground">Where requests stand right now</p>
          </CardHeader>
          <CardContent>
            {statusChartData.length === 0 ? (
              <EmptyChart label="No requests in this period yet" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={statusChartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke={chartGridColor} vertical={false} />
                  <XAxis dataKey="status" tick={{ fontSize: 12, fill: chartAxisColor, fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: chartAxisColor }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 10,
                      border: `1px solid ${chartTooltipBorder}`,
                      backgroundColor: chartTooltipBg,
                      boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                    }}
                    cursor={{ fill: "rgba(59, 130, 246, 0.06)" }}
                    formatter={(value) => [`${value} requests`, "Count"]}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="#3b82f6" animationDuration={600} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card
          className="border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out"
          style={{ animationDelay: "300ms", animationFillMode: "backwards" }}
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-gray-900">
              <Layers className="h-4 w-4 text-purple-600" /> Requests by Module
            </CardTitle>
            <p className="text-xs text-muted-foreground">Where the team's effort goes</p>
          </CardHeader>
          <CardContent>
            {modulePieData.length === 0 ? (
              <EmptyChart label="No requests in this period yet" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={modulePieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={95}
                    innerRadius={50}
                    dataKey="value"
                    animationDuration={600}
                  >
                    {modulePieData.map((entry, i) => <Cell key={i} fill={entry.fill} opacity={0.9} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 10,
                      border: `1px solid ${chartTooltipBorder}`,
                      backgroundColor: chartTooltipBg,
                      boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                    }}
                    formatter={(value) => [`${value} requests`, "Total"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Module Workload Table */}
      <Card
        className="border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out"
        style={{ animationDelay: "360ms", animationFillMode: "backwards" }}
      >
        <CardHeader className="pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base text-gray-900">
                <Layers className="h-4 w-4 text-indigo-600" /> Module Workload
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Where the team's attention should focus</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                  <th className="text-left font-semibold px-5 py-3">Module</th>
                  <th className="text-right font-semibold px-3 py-3">Total</th>
                  <th className="text-right font-semibold px-3 py-3">Active</th>
                  <th className="text-right font-semibold px-3 py-3">Overdue</th>
                  <th className="text-right font-semibold px-3 py-3">Completed</th>
                  <th className="text-right font-semibold px-5 py-3">Avg Days</th>
                </tr>
              </thead>
              <tbody>
                {moduleWorkload.every((m) => m.total === 0) ? (
                  <tr><td colSpan={6} className="text-center text-sm text-gray-400 py-8">No requests in this period yet</td></tr>
                ) : (
                  moduleWorkload.map((m) => (
                    <tr key={m.module} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3">
                        <Link href={`/${m.module}`} className="inline-flex items-center gap-2 font-medium text-gray-800 hover:text-blue-600">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: MODULE_COLORS[m.module] }} />
                          {m.label}
                        </Link>
                      </td>
                      <td className="text-right px-3 py-3 tabular-nums text-gray-700">{m.total}</td>
                      <td className="text-right px-3 py-3 tabular-nums text-blue-700 font-semibold">{m.active || "—"}</td>
                      <td className={cn("text-right px-3 py-3 tabular-nums font-semibold", m.overdue > 0 ? "text-red-600" : "text-gray-400")}>
                        {m.overdue || "—"}
                      </td>
                      <td className="text-right px-3 py-3 tabular-nums text-emerald-700">{m.completed || "—"}</td>
                      <td className="text-right px-5 py-3 tabular-nums text-gray-700">{m.avgDays > 0 ? `${m.avgDays}d` : "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Oldest Open + Recent Activity + Feedback */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Oldest Open */}
        <Card
          className="border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out"
          style={{ animationDelay: "420ms", animationFillMode: "backwards" }}
        >
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="flex items-center gap-2 text-base text-gray-900">
              <Clock className="h-4 w-4 text-red-600" /> Oldest Open Requests
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Longest-waiting items still active</p>
          </CardHeader>
          <CardContent className="p-0">
            {oldestOpen.length === 0 ? (
              <EmptyRow label="No open requests. Great job." />
            ) : (
              <ul>
                {oldestOpen.map((r) => (
                  <li key={r.id} className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50/60 transition-colors">
                    <Link href={`/requests/${r.id}`} className="flex items-center gap-3 px-4 py-3">
                      <span className={cn("h-2 w-2 rounded-full flex-shrink-0", STATUS_DOT[r.status] ?? "bg-gray-400")} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{r.title}</p>
                        <p className="text-xs text-gray-500 truncate">{r.id} · {r.requesterName ?? "—"}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border", STATUS_COLORS[r.status] ?? "bg-gray-50 text-gray-700", "border-gray-200")}>
                          {STATUS_LABELS[r.status] ?? r.status}
                        </span>
                        <span className={cn("text-xs font-medium tabular-nums", r.ageDays > 7 ? "text-red-600" : "text-gray-500")}>
                          {r.ageDays}d old
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card
          className="border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out"
          style={{ animationDelay: "480ms", animationFillMode: "backwards" }}
        >
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="flex items-center gap-2 text-base text-gray-900">
              <Activity className="h-4 w-4 text-blue-600" /> Recent Activity
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Latest updates in this period</p>
          </CardHeader>
          <CardContent className="p-0">
            {recentActivity.length === 0 ? (
              <EmptyRow label="No activity yet." />
            ) : (
              <ul>
                {recentActivity.map((r) => (
                  <li key={r.id} className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50/60 transition-colors">
                    <Link href={`/requests/${r.id}`} className="flex items-center gap-3 px-4 py-3">
                      <span className={cn("h-2 w-2 rounded-full flex-shrink-0", STATUS_DOT[r.status] ?? "bg-gray-400")} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{r.title}</p>
                        <p className="text-xs text-gray-500 truncate">{r.id} · {r.module.toUpperCase()}</p>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0 tabular-nums">{timeAgo(r.updatedAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Feedback */}
        <Card
          className="border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out"
          style={{ animationDelay: "540ms", animationFillMode: "backwards" }}
        >
          <CardHeader className="pb-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base text-gray-900">
                  <Star className="h-4 w-4 text-amber-500" /> Recent Feedback
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {feedbackStats.count > 0 ? `${feedbackStats.avg.toFixed(1)}★ avg over ${feedbackStats.count}` : "No responses yet"}
                </p>
              </div>
              <Link href="/feedback-reports" className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {feedbackStats.recent.length === 0 ? (
              <EmptyRow label="Survey responses will show up here." />
            ) : (
              <ul>
                {feedbackStats.recent.map((f: any) => (
                  <li key={f.id} className="border-b border-gray-50 last:border-b-0 px-4 py-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">{f.requestId}</p>
                      <div className="flex gap-0.5 flex-shrink-0">
                        {[1,2,3,4,5].map((s) => (
                          <Star key={s} className={cn("h-3 w-3", s <= (f.rating ?? 0) ? "fill-amber-400 text-amber-400" : "text-gray-200")} />
                        ))}
                      </div>
                    </div>
                    {f.comment && (
                      <p className="text-xs text-gray-600 italic line-clamp-2">&ldquo;{f.comment}&rdquo;</p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-1">{f.requesterName} · {timeAgo(f.completedAt || f.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Empty-state coaching when no data */}
      {!hasData && (
        <Card className="border-dashed border-2 border-gray-200 shadow-none bg-gray-50/50">
          <CardContent className="py-10 text-center">
            <p className="text-base font-semibold text-gray-700">No data in this window yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Try a wider date range, or wait for the team to submit and process requests. Numbers will populate as requests come in.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── Small sub-components ─────────────────────────────────────────────────────

function SecondaryStat({ label, numericValue, suffix, tone, icon: Icon, index = 0 }: {
  label: string
  numericValue: number
  suffix?: string
  tone: "blue" | "emerald" | "red" | "purple"
  icon: React.ElementType
  index?: number
}) {
  const animated = useCountUp(numericValue, 600)
  const toneClasses: Record<string, string> = {
    blue: "text-blue-700 bg-blue-50",
    emerald: "text-emerald-700 bg-emerald-50",
    red: "text-red-700 bg-red-50",
    purple: "text-purple-700 bg-purple-50",
  }
  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white px-4 py-3 shadow-sm hover:border-gray-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out animate-in fade-in slide-in-from-bottom-1"
      style={{ animationDelay: `${index * 50 + 160}ms`, animationFillMode: "backwards" }}
    >
      <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center transition-transform duration-300 hover:scale-105", toneClasses[tone])}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-widest font-semibold text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-900 tabular-nums">
          {Number.isInteger(numericValue) ? Math.round(animated).toLocaleString() : animated.toFixed(1)}
          {suffix ?? ""}
        </p>
      </div>
    </div>
  )
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="h-[280px] flex items-center justify-center text-sm text-gray-400">
      {label}
    </div>
  )
}

function EmptyRow({ label }: { label: string }) {
  return <div className="text-sm text-gray-400 text-center py-8">{label}</div>
}
