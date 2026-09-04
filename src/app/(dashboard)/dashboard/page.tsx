"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"
import {
  FileText, Clock, CheckCircle2, AlertCircle, TrendingUp, TrendingDown, Minus,
  Activity, Star, Layers, ArrowRight, X,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getRequests, initializeMockData, type EngineRequest } from "@/services/engineService"
import { useNewRequestsAndTasks } from "@/hooks/useNewRequestsAndTasks"
import { NewItemsAlert } from "@/components/ui/NewItemsAlert"
import { useCountUp } from "@/hooks/useCountUp"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"
import { CompanyFilter, matchesCompanyFilter, type CompanyFilterValue } from "@/components/ui/CompanyFilter"

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  new:               "bg-sky-50 text-sky-700",
  in_progress:       "bg-blue-50 text-blue-700",
  on_hold:           "bg-blue-50 text-blue-700", // legacy alias
  in_customs:        "bg-amber-50 text-amber-700",
  awaiting_approval: "bg-amber-50 text-amber-700",
  delivered:         "bg-emerald-50 text-emerald-700",
  completed:         "bg-emerald-50 text-emerald-700",
  cancelled:         "bg-red-50 text-red-600",
}

const STATUS_DOT: Record<string, string> = {
  new:               "bg-sky-500",
  in_progress:       "bg-blue-500",
  on_hold:           "bg-blue-500",
  in_customs:        "bg-amber-500",
  awaiting_approval: "bg-amber-500",
  delivered:         "bg-emerald-500",
  completed:         "bg-emerald-500",
  cancelled:         "bg-red-500",
}

const STATUS_LABELS: Record<string, string> = {
  new:               "New",
  in_progress:       "In Progress",
  on_hold:           "In Progress", // legacy
  in_customs:        "In Customs",
  awaiting_approval: "Awaiting Approval",
  delivered:         "Completed",
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
  hr_general: "#0d9488",
  general: "#6366f1",
}

const MODULES = ["shipping", "maintenance", "purchase", "event", "travel", "hr", "general"] as const

const ACTIVE_STATUSES = new Set(["new", "in_progress", "on_hold", "in_customs", "awaiting_approval"])
const COMPLETED_STATUSES = new Set(["completed", "delivered"])

type TimeRange = "7d" | "15d" | "30d" | "90d" | "1y" | "all" | "custom"

interface DateRange { from: string; to: string }

const RANGE_DAYS: Record<Exclude<TimeRange, "custom" | "all">, number> = {
  "7d": 7, "15d": 15, "30d": 30, "90d": 90, "1y": 365,
}

const RANGE_LABELS: Record<TimeRange, string> = {
  "7d": "Last 7 Days",
  "15d": "Last 15 Days",
  "30d": "Last 30 Days",
  "90d": "Last Quarter",
  "1y": "Last Year",
  "all": "All Time",
  "custom": "Custom Range",
}

const MODULE_SLA_DAYS: Record<string, number> = {
  shipping: 14,
  maintenance: 5,
  purchase: 7,
  event: 5,
  travel: 7,
  hr: 5,
  hr_general: 5,
  general: 5,
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

function completionDate(request: EngineRequest): Date | null {
  const completedChange = [...(request.statusHistory ?? [])]
    .filter((change) => COMPLETED_STATUSES.has(change.status))
    .sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime())[0]
  if (completedChange) return new Date(completedChange.changedAt)
  return COMPLETED_STATUSES.has(request.status) ? new Date(request.updatedAt) : null
}

function requestSlaDays(request: EngineRequest): number {
  if (request.module === "maintenance") {
    const priority = String((request.payload as Record<string, unknown>)?.priority ?? "").toLowerCase()
    if (priority === "critical") return 1
    if (priority === "high") return 2
    if (priority === "medium") return 5
    if (priority === "low") return 7
  }
  return MODULE_SLA_DAYS[request.module] ?? 7
}

function isWithinSla(request: EngineRequest): boolean {
  const closedAt = completionDate(request)
  if (!closedAt) return false
  return daysBetween(new Date(request.createdAt), closedAt) <= requestSlaDays(request)
}

function moduleCountDriver(
  currentRequests: EngineRequest[],
  priorRequests: EngineRequest[],
  predicate: (request: EngineRequest) => boolean,
  metric: string,
  modules: readonly string[] = MODULES,
): string | null {
  const candidates = modules.map((module) => {
    const currentCount = currentRequests.filter((request) => request.module === module && predicate(request)).length
    const priorCount = priorRequests.filter((request) => request.module === module && predicate(request)).length
    return { module, currentCount, priorCount, change: currentCount - priorCount }
  }).filter((item) => item.change !== 0)
  const driver = candidates.sort((a, b) => Math.abs(b.change) - Math.abs(a.change))[0]
  if (!driver) return null
  const label = driver.module.charAt(0).toUpperCase() + driver.module.slice(1)
  const signedChange = `${driver.change > 0 ? "+" : ""}${driver.change}`
  return `Main driver: ${label} ${metric} ${driver.priorCount} → ${driver.currentCount} (${signedChange})`
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
  insight?: string | null
  /** Stagger index — multiplies a small base delay so the row fans in instead of popping all at once. */
  index?: number
}

function KPICard({ title, numericValue, suffix, display, icon: Icon, iconColor, iconBg, deltaPct, higherIsBetter, subtitle, insight, index = 0 }: KPICardProps) {
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
            {insight && <p className="mt-2 text-[11px] font-medium leading-4 text-gray-500">{insight}</p>}
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

interface DashboardPageProps {
  /** Restricts every KPI/chart/table on this dashboard to these module ids. Omit for the full company-wide dashboard. */
  moduleScope?: string[]
  title?: string
  /** Base path for request detail links (e.g. "/departments/hr/requests"). Defaults to the shared "/requests". */
  detailBasePath?: string
  /** Per-module override for the "Module Workload" row link (e.g. { hr_general: "/departments/hr/general" }). Falls back to "/<module>". */
  moduleLinks?: Record<string, string>
}

export default function DashboardPage({ moduleScope, title, detailBasePath = "/requests", moduleLinks }: DashboardPageProps = {}) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const chartAxisColor = isDark ? "#94a3b8" : "#64748b"
  const chartGridColor = isDark ? "#334155" : "#f1f5f9"
  const chartTooltipBg = isDark ? "#1e293b" : "#ffffff"
  const chartTooltipBorder = isDark ? "#334155" : "#e2e8f0"
  const scopeModules = moduleScope ?? MODULES
  const moduleHref = (mod: string) => moduleLinks?.[mod] ?? `/${mod}`

  const [requests, setRequests] = useState<EngineRequest[]>([])
  const [timeRange, setTimeRange] = useState<TimeRange>("30d")
  const [companyFilter, setCompanyFilter] = useState<CompanyFilterValue>("all")
  const [customRange, setCustomRange] = useState<DateRange>(() => {
    const now = new Date()
    const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    return { from: from.toISOString().split("T")[0], to: now.toISOString().split("T")[0] }
  })
  const [feedback, setFeedback] = useState<any[]>([])
  const [slaDetail, setSlaDetail] = useState<"compliance" | "exceptions" | null>(null)
  const [showSlaPolicy, setShowSlaPolicy] = useState(false)
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

  const companyRequests = useMemo(
    () => requests.filter((request) =>
      matchesCompanyFilter(request, companyFilter) && (!moduleScope || moduleScope.includes(request.module))
    ),
    [requests, companyFilter, moduleScope],
  )

  // Compute current and prior date windows for comparison
  const { current, prior } = useMemo(() => {
    const now = new Date()
    let from: Date, to: Date, priorFrom: Date, priorTo: Date

    if (timeRange === "all") {
      from = new Date(0)
      to = now
      priorFrom = new Date(0)
      priorTo = new Date(0)
    } else if (timeRange === "custom") {
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
    return companyRequests.filter((r) => {
      const d = new Date(r.createdAt)
      return d >= current.from && d <= current.to
    })
  }, [companyRequests, current])

  const priorRequests = useMemo(() => {
    return companyRequests.filter((r) => {
      const d = new Date(r.createdAt)
      return d >= prior.from && d <= prior.to
    })
  }, [companyRequests, prior])

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
      const status = COMPLETED_STATUSES.has(r.status) ? "completed" : r.status
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1
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
    return scopeModules.map((mod) => {
      const reqs = currentRequests.filter((r) => r.module === mod)
      const active = reqs.filter((r) => ACTIVE_STATUSES.has(r.status)).length
      const completed = reqs.filter((r) => COMPLETED_STATUSES.has(r.status)).length
      const overdue = reqs.filter((r) =>
        ACTIVE_STATUSES.has(r.status) && (now - new Date(r.createdAt).getTime()) > 7 * 24 * 60 * 60 * 1000
      ).length
      const avgDays = avgDaysToCompletion(reqs)
      const closed = reqs.filter((request) => COMPLETED_STATUSES.has(request.status))
      const slaCompliance = pct(closed.filter(isWithinSla).length, closed.length)
      const slaExceptions = reqs.filter((request) =>
        ACTIVE_STATUSES.has(request.status) && daysBetween(new Date(request.createdAt), new Date()) > requestSlaDays(request)
      ).length
      return {
        module: mod,
        label: mod.charAt(0).toUpperCase() + mod.slice(1),
        total: reqs.length,
        active,
        completed,
        overdue,
        avgDays,
        slaCompliance,
        slaExceptions,
      }
    })
  }, [currentRequests, scopeModules])

  const resolutionDriver = useMemo(() => {
    const candidates = scopeModules.map((module) => {
      const currentAverage = avgDaysToCompletion(currentRequests.filter((request) => request.module === module))
      const priorAverage = avgDaysToCompletion(priorRequests.filter((request) => request.module === module))
      return { module, currentAverage, priorAverage, change: currentAverage - priorAverage }
    }).filter((item) => item.currentAverage > 0 && item.priorAverage > 0)
    const driver = candidates.sort((a, b) => Math.abs(b.change) - Math.abs(a.change))[0]
    if (!driver) return null
    const label = driver.module.charAt(0).toUpperCase() + driver.module.slice(1)
    return `Main driver: ${label} resolution ${driver.priorAverage.toFixed(1)}d → ${driver.currentAverage.toFixed(1)}d`
  }, [currentRequests, priorRequests, scopeModules])

  const activeDriver = useMemo(() => moduleCountDriver(
    currentRequests,
    priorRequests,
    (request) => ACTIVE_STATUSES.has(request.status),
    "active",
    scopeModules,
  ), [currentRequests, priorRequests, scopeModules])

  const overdueDriver = useMemo(() => {
    const now = Date.now()
    return moduleCountDriver(
      currentRequests,
      priorRequests,
      (request) => ACTIVE_STATUSES.has(request.status) && (now - new Date(request.createdAt).getTime()) > 7 * 24 * 60 * 60 * 1000,
      "overdue",
      scopeModules,
    )
  }, [currentRequests, priorRequests, scopeModules])

  const teamWorkload = useMemo(() => {
    const members = new Map<string, {
      name: string
      email: string
      assigned: number
      active: number
      overdue: number
      completed: number
      completedRequests: EngineRequest[]
      completedByModule: Record<string, number>
    }>()
    const now = Date.now()
    currentRequests.forEach((request) => {
      const email = request.assignedToEmail?.trim().toLowerCase()
      if (!email) return
      const member = members.get(email) ?? {
        name: request.assignedToName || email,
        email,
        assigned: 0,
        active: 0,
        overdue: 0,
        completed: 0,
        completedRequests: [],
        completedByModule: {},
      }
      member.assigned += 1
      if (ACTIVE_STATUSES.has(request.status)) {
        member.active += 1
        if ((now - new Date(request.createdAt).getTime()) > 7 * 24 * 60 * 60 * 1000) member.overdue += 1
      }
      if (COMPLETED_STATUSES.has(request.status)) {
        member.completed += 1
        member.completedRequests.push(request)
        member.completedByModule[request.module] = (member.completedByModule[request.module] || 0) + 1
      }
      members.set(email, member)
    })
    const completedTotalsByModule = currentRequests.reduce<Record<string, number>>((totals, request) => {
      if (COMPLETED_STATUSES.has(request.status) && request.assignedToEmail) {
        totals[request.module] = (totals[request.module] || 0) + 1
      }
      return totals
    }, {})
    const representedModules = Object.keys(completedTotalsByModule).length
    return [...members.values()]
      .map((member) => ({
        ...member,
        avgDays: avgDaysToCompletion(member.completedRequests),
        balancedScore: representedModules === 0 ? 0 : Math.round(
          (Object.entries(member.completedByModule).reduce((score, [module, completed]) =>
            score + completed / completedTotalsByModule[module], 0
          ) / representedModules) * 1000
        ) / 10,
        moduleMix: Object.entries(member.completedByModule)
          .sort((a, b) => b[1] - a[1])
          .map(([module, count]) => `${module.charAt(0).toUpperCase() + module.slice(1)} ${count}`)
          .join(", "),
      }))
      .sort((a, b) => b.balancedScore - a.balancedScore || b.completed - a.completed)
  }, [currentRequests])

  const teamSummary = useMemo(() => {
    const activeRequests = currentRequests.filter((request) => ACTIVE_STATUSES.has(request.status))
    const unassigned = activeRequests.filter((request) => !request.assignedToEmail).length
    return {
      contributors: teamWorkload.length,
      unassigned,
      assignmentRate: pct(activeRequests.length - unassigned, activeRequests.length),
      completed: teamWorkload.reduce((sum, member) => sum + member.completed, 0),
    }
  }, [currentRequests, teamWorkload])

  const serviceMetrics = useMemo(() => {
    const closed = currentRequests.filter((request) => COMPLETED_STATUSES.has(request.status))
    const completedWithinSla = closed.filter(isWithinSla).length
    const active = companyRequests.filter((request) => ACTIVE_STATUSES.has(request.status))
    const slaOverdue = active.filter((request) =>
      daysBetween(new Date(request.createdAt), new Date()) > requestSlaDays(request)
    )
    const missingAssignee = active.filter((request) => !request.assignedToEmail).length
    const missingCompany = companyRequests.filter((request) => !request.companyId && !request.requesterEmail).length
    const missingHistory = companyRequests.filter((request) => !request.statusHistory?.length).length
    return {
      slaCompliance: pct(completedWithinSla, closed.length),
      completedWithinSla,
      closed: closed.length,
      slaOverdue: slaOverdue.length,
      closedRequests: closed,
      slaExceptionRequests: slaOverdue,
      missingAssignee,
      dataIssues: missingCompany + missingHistory,
    }
  }, [currentRequests, companyRequests])

  // Top 5 oldest open requests (across full request set, not date-filtered —
  // the oldest backlog matters regardless of when it was filed)
  const oldestOpen = useMemo(() => {
    const now = Date.now()
    return companyRequests
      .filter((r) => ACTIVE_STATUSES.has(r.status))
      .map((r) => ({
        ...r,
        ageDays: Math.floor((now - new Date(r.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
      }))
      .sort((a, b) => b.ageDays - a.ageDays)
      .slice(0, 5)
  }, [companyRequests])

  // Recent activity (latest 8 updates in current window)
  const recentActivity = useMemo(() => {
    return [...currentRequests]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 8)
  }, [currentRequests])

  // Feedback summary
  const feedbackStats = useMemo(() => {
    const scopedFeedback = feedback.filter((item) => {
      const request = companyRequests.find((candidate) => candidate.id === item.requestId)
      if (request) return true
      if (companyFilter === "all") return true
      return matchesCompanyFilter({ requesterEmail: item.requesterEmail }, companyFilter)
    })
    if (scopedFeedback.length === 0) return { count: 0, avg: 0, csat: 0, recent: [] as any[] }
    const ratings = scopedFeedback.map((f) => Number(f.rating) || 0).filter((n) => n > 0)
    const avg = ratings.length > 0 ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : 0
    const csat = ratings.length > 0 ? pct(ratings.filter((r) => r >= 4).length, ratings.length) : 0
    const recent = [...scopedFeedback]
      .sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime())
      .slice(0, 4)
    return { count: scopedFeedback.length, avg, csat, recent }
  }, [feedback, companyRequests, companyFilter])

  // Chart data
  const statusChartData = useMemo(() => {
    const order = ["new", "in_progress", "on_hold", "in_customs", "awaiting_approval", "completed", "cancelled"]
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
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">{title ?? "Dashboard"}</h1>
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
        {(["7d", "15d", "30d", "90d", "1y", "all"] as const).map((range) => (
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <CompanyFilter value={companyFilter} onChange={setCompanyFilter} />
        <button type="button" onClick={() => setShowSlaPolicy(true)} className="inline-flex h-9 items-center gap-2 rounded-md border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 shadow-sm hover:border-blue-300 hover:text-blue-700">
          <Clock className="h-4 w-4" /> View SLA Policy
        </button>
      </div>

      {/* Hero KPIs — period-over-period */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          index={0}
          title="Active Requests"
          numericValue={stats.active}
          subtitle="Open right now"
          insight={activeDriver}
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
          insight={overdueDriver}
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
          insight={resolutionDriver}
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

      {/* Team effort and ownership */}
      <Card className="border border-gray-100 shadow-sm">
        <CardHeader className="border-b border-gray-100 pb-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base text-gray-900">
                <Activity className="h-4 w-4 text-green-600" /> Team Effort
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">Ownership, throughput, and workload for the selected company and period</p>
              <p className="mt-2 max-w-3xl text-[11px] leading-4 text-gray-500">Balanced effort gives every represented module equal weight, then measures each member&apos;s share inside that module. High-volume Shipping work therefore cannot overpower lower-volume Travel, HR, or Event work.</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-md bg-blue-50 px-2.5 py-1.5 font-semibold text-blue-700">{teamSummary.contributors} contributors</span>
              <span className="rounded-md bg-emerald-50 px-2.5 py-1.5 font-semibold text-emerald-700">{teamSummary.completed} completed</span>
              <span className={cn("rounded-md px-2.5 py-1.5 font-semibold", teamSummary.unassigned ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-600")}>{teamSummary.unassigned} unassigned active</span>
              <span className="rounded-md bg-purple-50 px-2.5 py-1.5 font-semibold text-purple-700">{teamSummary.assignmentRate}% assignment coverage</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_minmax(520px,1.5fr)]">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Module-balanced contribution</p>
            <p className="mb-3 text-[11px] text-gray-400">Share of completed team output after equalizing module volume</p>
            {teamWorkload.length === 0 ? <EmptyChart label="No assigned work in this period" /> : (
              <ResponsiveContainer width="100%" height={Math.max(220, teamWorkload.slice(0, 8).length * 38)}>
                <BarChart data={teamWorkload.slice(0, 8)} layout="vertical" margin={{ left: 15, right: 20 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke={chartGridColor} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: chartAxisColor }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={115} tick={{ fontSize: 11, fill: chartAxisColor }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value) => [`${value}%`, "Balanced effort"]} />
                  <Bar dataKey="balancedScore" fill="#16a34a" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-xs uppercase tracking-wider text-gray-500">
                <th className="py-2 text-left">Team member</th><th className="px-2 py-2 text-left">Completed mix</th><th className="px-2 py-2 text-right">Active</th><th className="px-2 py-2 text-right">Overdue</th><th className="px-2 py-2 text-right">Completed</th><th className="px-2 py-2 text-right">Balanced effort</th><th className="py-2 text-right">Avg days</th>
              </tr></thead>
              <tbody>{teamWorkload.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-gray-400">No assigned work in this period</td></tr>
              ) : teamWorkload.map((member) => (
                <tr key={member.email} className="border-b border-gray-50">
                  <td className="py-3"><p className="font-medium text-gray-900">{member.name}</p><p className="text-[11px] text-gray-400">{member.email}</p></td>
                  <td className="max-w-48 px-2 py-3 text-left text-[11px] text-gray-500">{member.moduleMix || "—"}</td><td className="px-2 py-3 text-right font-semibold tabular-nums text-blue-700">{member.active}</td><td className={cn("px-2 py-3 text-right font-semibold tabular-nums", member.overdue ? "text-red-600" : "text-gray-400")}>{member.overdue || "—"}</td><td className="px-2 py-3 text-right font-semibold tabular-nums text-emerald-700">{member.completed}</td><td className="px-2 py-3 text-right font-semibold tabular-nums text-green-700">{member.balancedScore}%</td><td className="py-3 text-right tabular-nums">{member.avgDays ? `${member.avgDays}d` : "—"}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Secondary KPI strip — totals */}
      <div className="grid grid-cols-2 xl:grid-cols-6 gap-3">
        <SecondaryStat index={0} label="All Requests" numericValue={companyRequests.length} tone="blue" icon={FileText} />
        <SecondaryStat index={1} label="Created in Period" numericValue={stats.total} tone="blue" icon={FileText} />
        <SecondaryStat index={2} label="Completed" numericValue={stats.completed} tone="emerald" icon={CheckCircle2} />
        <SecondaryStat index={3} label="Completion Rate" numericValue={stats.completionRate} suffix="%" tone="purple" icon={TrendingUp} />
        <SecondaryStat index={4} label="SLA Compliance" numericValue={serviceMetrics.slaCompliance} suffix="%" tone="emerald" icon={CheckCircle2} onClick={() => setSlaDetail("compliance")} />
        <SecondaryStat index={5} label="SLA Exceptions" numericValue={serviceMetrics.slaOverdue} tone="red" icon={AlertCircle} onClick={() => setSlaDetail("exceptions")} />
      </div>

      {(serviceMetrics.missingAssignee > 0 || serviceMetrics.dataIssues > 0) && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
          <div>
            <p className="font-semibold text-amber-900">Operational data quality requires attention</p>
            <p className="mt-0.5 text-xs text-amber-800">Reliable workload and SLA reporting depends on complete ownership and status history.</p>
          </div>
          <div className="flex gap-2 text-xs font-semibold text-amber-900">
            {serviceMetrics.missingAssignee > 0 && <span className="rounded border border-amber-300 bg-white px-2.5 py-1">{serviceMetrics.missingAssignee} active unassigned</span>}
            {serviceMetrics.dataIssues > 0 && <span className="rounded border border-amber-300 bg-white px-2.5 py-1">{serviceMetrics.dataIssues} incomplete records</span>}
          </div>
        </div>
      )}

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
                  <th className="text-right font-semibold px-3 py-3">SLA</th>
                  <th className="text-right font-semibold px-3 py-3">Exceptions</th>
                  <th className="text-right font-semibold px-5 py-3">Avg Days</th>
                </tr>
              </thead>
              <tbody>
                {moduleWorkload.every((m) => m.total === 0) ? (
                  <tr><td colSpan={8} className="text-center text-sm text-gray-400 py-8">No requests in this period yet</td></tr>
                ) : (
                  moduleWorkload.map((m) => (
                    <tr key={m.module} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3">
                        <Link href={moduleHref(m.module)} className="inline-flex items-center gap-2 font-medium text-gray-800 hover:text-blue-600">
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
                      <td className="text-right px-3 py-3 tabular-nums font-semibold text-gray-700">{m.completed ? `${m.slaCompliance}%` : "—"}</td>
                      <td className={cn("text-right px-3 py-3 tabular-nums font-semibold", m.slaExceptions ? "text-red-600" : "text-gray-400")}>{m.slaExceptions || "—"}</td>
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
                    <Link href={`${detailBasePath}/${r.id}`} className="flex items-center gap-3 px-4 py-3">
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
                    <Link href={`${detailBasePath}/${r.id}`} className="flex items-center gap-3 px-4 py-3">
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

      {slaDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-labelledby="sla-detail-title">
          <div className="flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b px-6 py-4">
              <div>
                <h2 id="sla-detail-title" className="text-lg font-semibold text-gray-900">{slaDetail === "compliance" ? "SLA Compliance Details" : "Active SLA Exceptions"}</h2>
                <p className="mt-1 text-sm text-gray-500">{slaDetail === "compliance" ? `${serviceMetrics.completedWithinSla} of ${serviceMetrics.closed} completed requests met their module SLA in the selected period.` : `${serviceMetrics.slaOverdue} active requests have exceeded their module-specific SLA.`}</p>
              </div>
              <button type="button" onClick={() => setSlaDetail(null)} className="rounded-md p-2 text-gray-500 hover:bg-gray-100" aria-label="Close SLA details"><X className="h-5 w-5" /></button>
            </div>
            <div className="overflow-auto">
              <table className="w-full min-w-[800px] text-sm">
                <thead className="sticky top-0 bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                  <tr><th className="px-5 py-3 text-left">Request</th><th className="px-3 py-3 text-left">Module</th><th className="px-3 py-3 text-left">Company</th><th className="px-3 py-3 text-left">Owner</th><th className="px-3 py-3 text-right">SLA target</th><th className="px-3 py-3 text-right">Actual age</th><th className="px-5 py-3 text-right">Result</th></tr>
                </thead>
                <tbody>
                  {(slaDetail === "compliance" ? serviceMetrics.closedRequests : serviceMetrics.slaExceptionRequests).length === 0 ? (
                    <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400">No requests match this view.</td></tr>
                  ) : (slaDetail === "compliance" ? serviceMetrics.closedRequests : serviceMetrics.slaExceptionRequests).map((request) => {
                    const closedAt = completionDate(request)
                    const actualDays = daysBetween(new Date(request.createdAt), closedAt ?? new Date())
                    const compliant = closedAt ? isWithinSla(request) : false
                    return (
                      <tr key={request.id} className="border-t border-gray-100 hover:bg-gray-50/70">
                        <td className="px-5 py-3"><Link href={`${detailBasePath}/${request.id}`} className="font-semibold text-blue-700 hover:underline">{request.id}</Link><p className="mt-0.5 max-w-72 truncate text-xs text-gray-500">{request.title}</p></td>
                        <td className="px-3 py-3 capitalize text-gray-700">{request.module}</td>
                        <td className="px-3 py-3 text-gray-700">{request.companyName ?? (matchesCompanyFilter(request, "buchi") ? "BUCHI" : "Si-Ware Systems")}</td>
                        <td className="px-3 py-3 text-gray-700">{request.assignedToName || "Unassigned"}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{requestSlaDays(request)}d</td>
                        <td className="px-3 py-3 text-right tabular-nums">{actualDays.toFixed(1)}d</td>
                        <td className="px-5 py-3 text-right"><span className={cn("inline-flex rounded-md px-2 py-1 text-xs font-semibold", closedAt ? (compliant ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700") : "bg-red-50 text-red-700")}>{closedAt ? (compliant ? "Within SLA" : "Completed late") : "Active exception"}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showSlaPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-labelledby="sla-policy-title">
          <div className="max-h-[85vh] w-full max-w-3xl overflow-auto rounded-xl border bg-white shadow-2xl">
            <div className="sticky top-0 flex items-start justify-between gap-4 border-b bg-white px-6 py-4">
              <div><h2 id="sla-policy-title" className="text-lg font-semibold text-gray-900">Service-Level Agreement Policy</h2><p className="mt-1 text-sm text-gray-500">Operational targets used by Dashboard reporting for Admin and Logistics requests.</p></div>
              <button type="button" onClick={() => setShowSlaPolicy(false)} className="rounded-md p-2 text-gray-500 hover:bg-gray-100" aria-label="Close SLA policy"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-5 p-6">
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-sm"><thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500"><tr><th className="px-4 py-3 text-left">Module</th><th className="px-4 py-3 text-left">Target</th><th className="px-4 py-3 text-left">Operational context</th></tr></thead>
                  <tbody className="divide-y">
                    <tr><td className="px-4 py-3 font-medium">Shipping</td><td className="px-4 py-3">14 days</td><td className="px-4 py-3 text-gray-500">Delivery, transit, and customs workflow</td></tr>
                    <tr><td className="px-4 py-3 font-medium">Purchase</td><td className="px-4 py-3">7 days</td><td className="px-4 py-3 text-gray-500">Approval and procurement processing</td></tr>
                    <tr><td className="px-4 py-3 font-medium">Travel</td><td className="px-4 py-3">7 days</td><td className="px-4 py-3 text-gray-500">Approval and booking coordination</td></tr>
                    <tr><td className="px-4 py-3 font-medium">HR</td><td className="px-4 py-3">5 days</td><td className="px-4 py-3 text-gray-500">Onboarding and offboarding administration</td></tr>
                    <tr><td className="px-4 py-3 font-medium">Event</td><td className="px-4 py-3">5 days</td><td className="px-4 py-3 text-gray-500">Event planning and coordination</td></tr>
                    <tr><td className="px-4 py-3 font-medium">General</td><td className="px-4 py-3">5 days</td><td className="px-4 py-3 text-gray-500">General administration requests</td></tr>
                    <tr><td className="px-4 py-3 font-medium">Maintenance</td><td className="px-4 py-3">1–7 days</td><td className="px-4 py-3 text-gray-500">Critical 1 day · High 2 days · Medium 5 days · Low 7 days</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-4 text-sm text-blue-950">
                <p className="font-semibold">Measurement rules</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-blue-900">
                  <li>The SLA clock starts at the request creation timestamp.</li>
                  <li>The clock stops at the first Completed or Delivered status-history timestamp; Delivered and Completed are treated as the same outcome.</li>
                  <li>Legacy completed records without a completion event use their last update timestamp.</li>
                  <li>An active request becomes an SLA exception when its elapsed age exceeds its applicable module or Maintenance-priority target.</li>
                  <li>Company and date filters apply to SLA reporting; Shipping always belongs to Si-Ware Systems.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Small sub-components ─────────────────────────────────────────────────────

function SecondaryStat({ label, numericValue, suffix, tone, icon: Icon, index = 0, onClick }: {
  label: string
  numericValue: number
  suffix?: string
  tone: "blue" | "emerald" | "red" | "purple"
  icon: React.ElementType
  index?: number
  onClick?: () => void
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
      onClick={onClick}
      onKeyDown={(event) => { if (onClick && (event.key === "Enter" || event.key === " ")) onClick() }}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cn("flex items-center gap-3 rounded-lg border border-gray-100 bg-white px-4 py-3 shadow-sm hover:border-gray-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out animate-in fade-in slide-in-from-bottom-1", onClick && "cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500")}
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
        {onClick && <p className="mt-0.5 text-[10px] font-medium text-blue-600">View details</p>}
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
