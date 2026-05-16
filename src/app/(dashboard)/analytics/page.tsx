"use client"

import { useCallback, useEffect, useState } from "react"
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts"
import {
  TrendingUp, TrendingDown, CheckCircle2, Clock, AlertTriangle,
  Activity, Package, Users, BarChart3, Target, RefreshCw,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// ── Types ──────────────────────────────────────────────────────────────────

interface AnalyticsData {
  kpis: {
    totalRequests: number
    completionRate: number
    avgResolutionDays: number
    cancellationRate: number
    slaCompliance: number
    activeRequests: number
  }
  monthlyVolume: Array<{ month: string; total: number; completed: number; cancelled: number }>
  moduleStats: Array<{
    module: string; total: number; completed: number; cancelled: number
    avgResolutionDays: number; completionRate: number
  }>
  resolutionBuckets: Array<{ range: string; count: number }>
  topRequesters: Array<{ name: string; total: number; completed: number; completionRate: number }>
  dayOfWeekDistribution: Array<{ day: string; count: number }>
  statusBreakdown: Array<{ status: string; count: number; percentage: number }>
}

// ── Constants ───────────────────────────────────────────────────────────────

const RANGE_OPTIONS = [
  { label: "30 Days",   value: "30" },
  { label: "90 Days",   value: "90" },
  { label: "6 Months",  value: "180" },
  { label: "12 Months", value: "365" },
  { label: "All Time",  value: "0" },
]

const MODULE_COLORS: Record<string, string> = {
  shipping:    "#3b82f6",
  maintenance: "#a855f7",
  purchase:    "#22c55e",
  event:       "#f97316",
  travel:      "#ec4899",
  hr:          "#14b8a6",
}

const STATUS_COLORS: Record<string, string> = {
  completed:  "#10b981",
  new:        "#0ea5e9",
  on_hold:    "#f59e0b",
  cancelled:  "#ef4444",
  in_transit: "#f59e0b",
  delivered:  "#22c55e",
  draft:      "#94a3b8",
  in_customs: "#8b5cf6",
}

const STATUS_LABELS: Record<string, string> = {
  completed: "Completed", new: "New", on_hold: "On Hold",
  cancelled: "Cancelled", in_transit: "In Transit",
  delivered: "Delivered", draft: "Draft", in_customs: "In Customs",
}

const BUCKET_COLORS: Record<string, string> = {
  "Same Day":        "#10b981",
  "1–3 Days":        "#22c55e",
  "4–7 Days (SLA)":  "#3b82f6",
  "8–14 Days":       "#f59e0b",
  "15+ Days":        "#ef4444",
}

// ── KPI Card ────────────────────────────────────────────────────────────────

interface KPICardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  color: string
  bg: string
  trend?: { value: number; positive: boolean; label: string }
}

function KPICard({ title, value, subtitle, icon: Icon, color, bg, trend }: KPICardProps) {
  return (
    <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{title}</p>
            <p className="text-3xl font-bold mt-2 tracking-tight text-gray-900">{value}</p>
            {subtitle && <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>}
            {trend && (
              <div className={cn(
                "inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-semibold",
                trend.positive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
              )}>
                {trend.positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {trend.value}% {trend.label}
              </div>
            )}
          </div>
          <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0", bg)}>
            <Icon className={cn("h-5 w-5", color)} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Custom Tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: {
  active?: boolean; payload?: Array<{ color: string; name: string; value: number }>; label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      {label && <p className="font-semibold text-gray-700 mb-2">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-medium text-gray-800">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── Empty State ──────────────────────────────────────────────────────────────

function EmptyChart({ message = "No data yet — analytics will populate as requests come in" }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-44 text-gray-300 select-none">
      <BarChart3 className="h-12 w-12 mb-3 opacity-40" />
      <p className="text-sm text-gray-400 text-center max-w-48 leading-relaxed">{message}</p>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState("90")
  const [refreshKey, setRefreshKey] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/analytics?range=${range}`)
      if (res.ok) setData(await res.json() as AnalyticsData)
    } finally {
      setLoading(false)
    }
  }, [range])

  useEffect(() => { void load() }, [load, refreshKey])

  const kpis = data?.kpis
  const hasData = (data?.kpis.totalRequests ?? 0) > 0

  return (
    <div className="space-y-8">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Analytics & Insights</h1>
          <p className="text-sm text-gray-500 mt-1">
            Request performance, resolution trends, and workload distribution — visible to managers and above
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRange(opt.value)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  range === opt.value
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            disabled={loading}
            className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard
          title="Total Requests"
          value={loading ? "—" : (kpis?.totalRequests ?? 0)}
          icon={Package}
          color="text-blue-600" bg="bg-blue-50"
        />
        <KPICard
          title="Active"
          value={loading ? "—" : (kpis?.activeRequests ?? 0)}
          subtitle="In progress"
          icon={Activity}
          color="text-orange-500" bg="bg-orange-50"
        />
        <KPICard
          title="Completion Rate"
          value={loading ? "—" : `${kpis?.completionRate ?? 0}%`}
          icon={CheckCircle2}
          color="text-emerald-600" bg="bg-emerald-50"
          trend={kpis ? { value: kpis.completionRate, positive: kpis.completionRate >= 70, label: "of total" } : undefined}
        />
        <KPICard
          title="Avg Resolution"
          value={loading ? "—" : `${kpis?.avgResolutionDays ?? 0}d`}
          subtitle="Completed requests"
          icon={Clock}
          color="text-teal-600" bg="bg-teal-50"
        />
        <KPICard
          title="SLA Compliance"
          value={loading ? "—" : `${kpis?.slaCompliance ?? 0}%`}
          subtitle="Resolved ≤ 7 days"
          icon={Target}
          color="text-violet-600" bg="bg-violet-50"
          trend={kpis ? { value: kpis.slaCompliance, positive: kpis.slaCompliance >= 80, label: "on-time" } : undefined}
        />
        <KPICard
          title="Cancellation"
          value={loading ? "—" : `${kpis?.cancellationRate ?? 0}%`}
          icon={AlertTriangle}
          color="text-red-500" bg="bg-red-50"
          trend={kpis ? { value: kpis.cancellationRate, positive: kpis.cancellationRate < 10, label: "of total" } : undefined}
        />
      </div>

      {/* ── Volume Trend + Status Breakdown ────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        <Card className="xl:col-span-2 border border-gray-100 shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-800">
              <TrendingUp className="h-4 w-4 text-blue-500" /> Monthly Request Volume
            </CardTitle>
            <p className="text-xs text-gray-400">12-month rolling view — total vs completed vs cancelled</p>
          </CardHeader>
          <CardContent>
            {!hasData && !loading ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data?.monthlyVolume ?? []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="total"     name="Total"     stroke="#3b82f6" strokeWidth={2} fill="url(#totalGrad)"     dot={false} />
                  <Area type="monotone" dataKey="completed" name="Completed" stroke="#10b981" strokeWidth={2} fill="url(#completedGrad)" dot={false} />
                  <Area type="monotone" dataKey="cancelled" name="Cancelled" stroke="#ef4444" strokeWidth={1.5} fill="none" dot={false} strokeDasharray="4 2" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border border-gray-100 shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-800">
              <Activity className="h-4 w-4 text-violet-500" /> Status Breakdown
            </CardTitle>
            <p className="text-xs text-gray-400">Current distribution across all statuses</p>
          </CardHeader>
          <CardContent>
            {!hasData && !loading ? <EmptyChart /> : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={data?.statusBreakdown ?? []}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={80}
                      dataKey="count" paddingAngle={2}
                    >
                      {(data?.statusBreakdown ?? []).map((entry, i) => (
                        <Cell key={i} fill={STATUS_COLORS[entry.status] ?? "#94a3b8"} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number, name: string) => [v, STATUS_LABELS[name] ?? name]}
                      contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {(data?.statusBreakdown ?? []).slice(0, 5).map((s, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[s.status] ?? "#94a3b8" }} />
                        <span className="text-gray-600">{STATUS_LABELS[s.status] ?? s.status}</span>
                      </div>
                      <span className="font-semibold text-gray-800">
                        {s.count} <span className="text-gray-400 font-normal">({s.percentage}%)</span>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Module Performance ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        <Card className="border border-gray-100 shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-800">
              <BarChart3 className="h-4 w-4 text-blue-500" /> Module Completion Rate
            </CardTitle>
            <p className="text-xs text-gray-400">Percentage of requests fully resolved, per module</p>
          </CardHeader>
          <CardContent>
            {!hasData && !loading ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={data?.moduleStats ?? []}
                  layout="vertical"
                  margin={{ top: 0, right: 30, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} unit="%" />
                  <YAxis
                    type="category" dataKey="module"
                    tick={{ fontSize: 12, fill: "#475569" }}
                    axisLine={false} tickLine={false} width={85}
                    tickFormatter={(v: string) => v.charAt(0).toUpperCase() + v.slice(1)}
                  />
                  <Tooltip
                    formatter={(v: number) => [`${v}%`, "Completion Rate"]}
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                  />
                  <Bar dataKey="completionRate" radius={[0, 6, 6, 0]} name="Completion Rate">
                    {(data?.moduleStats ?? []).map((entry, i) => (
                      <Cell key={i} fill={MODULE_COLORS[entry.module] ?? "#94a3b8"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border border-gray-100 shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-800">
              <Package className="h-4 w-4 text-orange-500" /> Module Performance Summary
            </CardTitle>
            <p className="text-xs text-gray-400">Volume, completion rate, and avg resolution per module</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Module</th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Done</th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Rate</th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Avg Days</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.moduleStats ?? []).map((m, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: MODULE_COLORS[m.module] ?? "#94a3b8" }} />
                          <span className="font-medium text-gray-700 capitalize">{m.module}</span>
                        </div>
                      </td>
                      <td className="text-right px-4 py-3 text-gray-600 font-medium">{m.total}</td>
                      <td className="text-right px-4 py-3 text-emerald-600 font-medium">{m.completed}</td>
                      <td className="text-right px-4 py-3">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-semibold",
                          m.completionRate >= 70 ? "bg-emerald-50 text-emerald-700" :
                          m.completionRate >= 40 ? "bg-amber-50 text-amber-700" :
                          m.total === 0          ? "bg-gray-50 text-gray-400" :
                          "bg-red-50 text-red-700"
                        )}>
                          {m.total === 0 ? "—" : `${m.completionRate}%`}
                        </span>
                      </td>
                      <td className="text-right px-4 py-3 text-gray-500 text-xs">
                        {m.avgResolutionDays > 0 ? `${m.avgResolutionDays}d` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Resolution Time + Day Pattern ───────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        <Card className="border border-gray-100 shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-800">
              <Clock className="h-4 w-4 text-teal-500" /> Resolution Time Distribution
            </CardTitle>
            <p className="text-xs text-gray-400">How long it takes to close requests — SLA target is 7 days</p>
          </CardHeader>
          <CardContent>
            {!hasData && !loading ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data?.resolutionBuckets ?? []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="range" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" name="Requests" radius={[6, 6, 0, 0]}>
                    {(data?.resolutionBuckets ?? []).map((b, i) => (
                      <Cell key={i} fill={BUCKET_COLORS[b.range] ?? "#94a3b8"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border border-gray-100 shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-800">
              <Activity className="h-4 w-4 text-pink-500" /> Submission Day Pattern
            </CardTitle>
            <p className="text-xs text-gray-400">Which days of the week receive the most requests</p>
          </CardHeader>
          <CardContent>
            {!hasData && !loading ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data?.dayOfWeekDistribution ?? []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" name="Requests" radius={[6, 6, 0, 0]}>
                    {(data?.dayOfWeekDistribution ?? []).map((d, i) => (
                      <Cell key={i} fill={d.day === "Fri" || d.day === "Sat" ? "#cbd5e1" : "#8b5cf6"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Top Requesters ──────────────────────────────────────────────── */}
      <Card className="border border-gray-100 shadow-sm">
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-800">
            <Users className="h-4 w-4 text-blue-500" /> Top Requesters
          </CardTitle>
          <p className="text-xs text-gray-400">Users with the highest request volume in the selected period</p>
        </CardHeader>
        <CardContent className="p-0">
          {!hasData && !loading ? (
            <div className="px-4 pb-4"><EmptyChart /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-12">Rank</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Submitted</th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Completed</th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Rate</th>
                    <th className="px-4 py-3 w-28"></th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.topRequesters ?? []).map((u, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <span className={cn(
                          "h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold",
                          i === 0 ? "bg-amber-100 text-amber-700" :
                          i === 1 ? "bg-slate-200 text-slate-600" :
                          i === 2 ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-500"
                        )}>
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">{u.name}</td>
                      <td className="text-right px-4 py-3 text-gray-600 font-semibold">{u.total}</td>
                      <td className="text-right px-4 py-3 text-emerald-600 font-medium">{u.completed}</td>
                      <td className="text-right px-4 py-3">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-semibold",
                          u.completionRate >= 70 ? "bg-emerald-50 text-emerald-700" :
                          u.completionRate >= 40 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
                        )}>
                          {u.completionRate}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full bg-blue-500 transition-all"
                            style={{ width: `${u.completionRate}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  )
}
