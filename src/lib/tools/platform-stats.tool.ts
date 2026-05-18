import { getPrisma } from "@/server/engine/prisma"
import type { AgentTool, ToolContext, ToolResult } from "@/lib/agent/types"
import { ToolError, PermissionError } from "@/lib/errors"
import { getPlatformStatsSchema } from "./validation"

// ─── 1-minute in-memory cache ─────────────────────────────────────────────────
// Keyed by `days` param; prevents hammering the DB on repeated AI tool calls.
// Replace with Redis for multi-instance deployments.

interface CacheEntry { data: unknown; expiresAt: number }
const statsCache = new Map<number, CacheEntry>()
const CACHE_TTL_MS = 60_000

function getCached(days: number): unknown | null {
  const entry = statsCache.get(days)
  if (!entry || Date.now() > entry.expiresAt) return null
  return entry.data
}

function setCache(days: number, data: unknown): void {
  statsCache.set(days, { data, expiresAt: Date.now() + CACHE_TTL_MS })
}

// ─── Tool ─────────────────────────────────────────────────────────────────────

export const getPlatformStatsTool: AgentTool = {
  allowedRoles: ["admin", "super_admin", "manager"],

  definition: {
    type: "function",
    function: {
      name: "get_platform_stats",
      description:
        "Return high-level KPIs and breakdowns for the platform over a given number of days. " +
        "Only available to managers and admins. " +
        "Use this when asked about totals, completion rates, pending counts, or module breakdowns.",
      parameters: {
        type: "object",
        properties: {
          days: {
            type: "number",
            description:
              "How many days back to include in the stats. Default 30, max 365.",
          },
        },
        required: [],
      },
    },
  },

  async execute(args: unknown, ctx: ToolContext): Promise<ToolResult> {
    const isPrivileged = ["admin", "super_admin", "manager"].includes(ctx.userRole)
    if (!isPrivileged) {
      throw new PermissionError("view platform statistics")
    }

    const parsed = getPlatformStatsSchema.safeParse(args)
    if (!parsed.success) {
      throw new ToolError(
        `Invalid arguments: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
        "get_platform_stats",
      )
    }

    const { days } = parsed.data

    // Return cached result if fresh
    const cached = getCached(days)
    if (cached) return { success: true, data: cached }

    const since = new Date()
    since.setDate(since.getDate() - days)

    // A request is overdue when it hasn't been touched in 7+ days and is still open.
    // Using updatedAt (not createdAt) correctly captures stalled in-progress requests.
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const prisma = getPrisma()

    // Run all aggregation queries in parallel
    const [total, byStatus, byModule, completed, overdue] = await Promise.all([
      // Total requests in window
      prisma.request.count({ where: { createdAt: { gte: since } } }),

      // Count per status
      prisma.request.groupBy({
        by: ["status"],
        _count: { id: true },
        where: { createdAt: { gte: since } },
      }),

      // Count per module
      prisma.request.groupBy({
        by: ["module"],
        _count: { id: true },
        where: { createdAt: { gte: since } },
      }),

      // Completed requests in window (for completion rate)
      prisma.request.count({
        where: { status: "completed", createdAt: { gte: since } },
      }),

      // Overdue: open requests not updated in 7+ days (stalled)
      prisma.request.count({
        where: {
          status: { notIn: ["completed", "cancelled", "delivered"] },
          updatedAt: { lt: sevenDaysAgo },
        },
      }),
    ])

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

    const data = {
      period: `Last ${days} days`,
      total,
      completed,
      overdue,
      completionRate: `${completionRate}%`,
      byStatus: Object.fromEntries(
        byStatus.map((r) => [r.status, r._count.id]),
      ),
      byModule: Object.fromEntries(
        byModule.map((r) => [r.module, r._count.id]),
      ),
    }

    setCache(days, data)

    return { success: true, data }
  },
}
