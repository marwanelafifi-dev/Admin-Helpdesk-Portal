import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/options"
import { getPrisma } from "@/server/engine/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ALLOWED_ROLES = ["super_admin", "admin", "manager"]
const MODULES = ["shipping", "maintenance", "purchase", "event", "travel", "hr"]

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !ALLOWED_ROLES.includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const url = new URL(req.url)
  const range = url.searchParams.get("range") ?? "90"
  const daysBack = parseInt(range, 10)
  const since = daysBack === 0 ? new Date(0) : new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)

  const prisma = getPrisma()

  const requests = await prisma.request.findMany({
    where: daysBack === 0 ? undefined : { createdAt: { gte: since } },
    select: {
      id: true,
      module: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      requesterId: true,
      requester: { select: { name: true, email: true } },
    },
  })

  const total = requests.length

  // ── Monthly Volume (last 12 months always) ──────────────────────────────
  const monthlyMap: Record<string, { total: number; completed: number; cancelled: number }> = {}
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    monthlyMap[key] = { total: 0, completed: 0, cancelled: 0 }
  }

  // Use ALL requests for trend (not filtered by range)
  const allRequests = daysBack === 0
    ? requests
    : await prisma.request.findMany({
        select: { status: true, createdAt: true },
      })

  allRequests.forEach((r) => {
    const d = new Date(r.createdAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    if (monthlyMap[key]) {
      monthlyMap[key].total++
      if (r.status === "completed") monthlyMap[key].completed++
      if (r.status === "cancelled") monthlyMap[key].cancelled++
    }
  })

  const monthlyVolume = Object.entries(monthlyMap).map(([month, data]) => ({
    month: new Date(month + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
    ...data,
  }))

  // ── Module Stats ────────────────────────────────────────────────────────
  type ModBucket = { total: number; completed: number; cancelled: number; resolutionDays: number[] }
  const moduleMap: Record<string, ModBucket> = {}
  MODULES.forEach((m) => { moduleMap[m] = { total: 0, completed: 0, cancelled: 0, resolutionDays: [] } })

  requests.forEach((r) => {
    if (!moduleMap[r.module]) return
    moduleMap[r.module].total++
    if (r.status === "completed") {
      moduleMap[r.module].completed++
      const days = (new Date(r.updatedAt).getTime() - new Date(r.createdAt).getTime()) / 86400000
      moduleMap[r.module].resolutionDays.push(days)
    }
    if (r.status === "cancelled") moduleMap[r.module].cancelled++
  })

  const moduleStats = MODULES.map((m) => {
    const d = moduleMap[m]
    const avgResolution =
      d.resolutionDays.length > 0
        ? d.resolutionDays.reduce((a, b) => a + b, 0) / d.resolutionDays.length
        : 0
    return {
      module: m,
      total: d.total,
      completed: d.completed,
      cancelled: d.cancelled,
      avgResolutionDays: Math.round(avgResolution * 10) / 10,
      completionRate: d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0,
    }
  }).sort((a, b) => b.total - a.total)

  // ── Resolution Time Distribution ────────────────────────────────────────
  const completedRequests = requests.filter((r) => r.status === "completed")
  const resolutionBuckets = [
    { range: "Same Day", min: 0, max: 1, count: 0 },
    { range: "1–3 Days", min: 1, max: 3, count: 0 },
    { range: "4–7 Days (SLA)", min: 3, max: 7, count: 0 },
    { range: "8–14 Days", min: 7, max: 14, count: 0 },
    { range: "15+ Days", min: 14, max: Infinity, count: 0 },
  ]
  completedRequests.forEach((r) => {
    const days = (new Date(r.updatedAt).getTime() - new Date(r.createdAt).getTime()) / 86400000
    for (const b of resolutionBuckets) {
      if (days >= b.min && days < b.max) { b.count++; break }
    }
  })

  // ── Top Requesters ──────────────────────────────────────────────────────
  const requesterMap: Record<string, { name: string; total: number; completed: number }> = {}
  requests.forEach((r) => {
    if (!requesterMap[r.requesterId]) {
      requesterMap[r.requesterId] = {
        name: r.requester.name ?? r.requester.email ?? "Unknown",
        total: 0,
        completed: 0,
      }
    }
    requesterMap[r.requesterId].total++
    if (r.status === "completed") requesterMap[r.requesterId].completed++
  })
  const topRequesters = Object.values(requesterMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
    .map((u) => ({
      ...u,
      completionRate: u.total > 0 ? Math.round((u.completed / u.total) * 100) : 0,
    }))

  // ── Day-of-Week Pattern ─────────────────────────────────────────────────
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const dayMap = [0, 0, 0, 0, 0, 0, 0]
  requests.forEach((r) => { dayMap[new Date(r.createdAt).getDay()]++ })
  const dayOfWeekDistribution = dayNames.map((day, i) => ({ day, count: dayMap[i] }))

  // ── Status Breakdown ────────────────────────────────────────────────────
  const statusMap: Record<string, number> = {}
  requests.forEach((r) => { statusMap[r.status] = (statusMap[r.status] ?? 0) + 1 })
  const statusBreakdown = Object.entries(statusMap)
    .map(([status, count]) => ({
      status,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)

  // ── Overall KPIs ────────────────────────────────────────────────────────
  const completed = completedRequests.length
  const cancelled = requests.filter((r) => r.status === "cancelled").length

  const allResolutionDays = completedRequests.map((r) =>
    (new Date(r.updatedAt).getTime() - new Date(r.createdAt).getTime()) / 86400000
  )
  const avgResolutionDays =
    allResolutionDays.length > 0
      ? allResolutionDays.reduce((a, b) => a + b, 0) / allResolutionDays.length
      : 0

  const slaCompliant = completedRequests.filter((r) => {
    const days = (new Date(r.updatedAt).getTime() - new Date(r.createdAt).getTime()) / 86400000
    return days <= 7
  }).length

  return NextResponse.json({
    kpis: {
      totalRequests: total,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      avgResolutionDays: Math.round(avgResolutionDays * 10) / 10,
      cancellationRate: total > 0 ? Math.round((cancelled / total) * 100) : 0,
      slaCompliance: completed > 0 ? Math.round((slaCompliant / completed) * 100) : 0,
      activeRequests: requests.filter((r) => !["completed", "cancelled", "delivered"].includes(r.status)).length,
    },
    monthlyVolume,
    moduleStats,
    resolutionBuckets: resolutionBuckets.map(({ range, count }) => ({ range, count })),
    topRequesters,
    dayOfWeekDistribution,
    statusBreakdown,
  })
}
