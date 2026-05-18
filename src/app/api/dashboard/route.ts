import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { getPrisma } from '@/server/engine/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ACTIVE_STATUSES = ['draft', 'new', 'on_hold', 'in_customs', 'in_transit', 'pending_assignment', 'assigned', 'awaiting_input'] as const
const DONE_STATUSES = ['completed', 'delivered', 'resolved', 'closed'] as const
const SEVEN_DAYS_AGO = () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!can(session.user.role, 'dashboard')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const prisma = getPrisma()

    // Run all aggregation queries in parallel — no full table scan
    const [
      totalCount,
      activeCount,
      completedCount,
      cancelledCount,
      pendingApprovalsCount,
      overdueCount,
      statusGroups,
      moduleGroups,
      recentRequests,
      completedForAvg,
    ] = await Promise.all([
      prisma.request.count(),
      prisma.request.count({ where: { status: { in: [...ACTIVE_STATUSES] } } }),
      prisma.request.count({ where: { status: { in: [...DONE_STATUSES] } } }),
      prisma.request.count({ where: { status: 'cancelled' } }),
      prisma.request.count({ where: { status: { in: ['new', 'on_hold'] } } }),
      prisma.request.count({
        where: {
          status: { notIn: ['completed', 'cancelled', 'delivered', 'resolved', 'closed'] },
          createdAt: { lt: SEVEN_DAYS_AGO() },
        },
      }),
      prisma.request.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.request.groupBy({ by: ['module'], _count: { _all: true } }),
      prisma.request.findMany({
        select: {
          id: true, module: true, title: true, status: true,
          requesterId: true, createdAt: true, updatedAt: true,
          requester: { select: { name: true, email: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }),
      prisma.request.findMany({
        where: { status: { in: [...DONE_STATUSES] } },
        select: { createdAt: true, updatedAt: true },
      }),
    ])

    const totalResolutionMs = completedForAvg.reduce((sum, r) => {
      return sum + (r.updatedAt.getTime() - r.createdAt.getTime())
    }, 0)
    const avgResolutionDays = completedForAvg.length > 0
      ? Math.round(totalResolutionMs / completedForAvg.length / 86400000)
      : 0
    const cancellationRate = totalCount > 0 ? Math.round((cancelledCount / totalCount) * 100) : 0
    const onTimeRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

    const statusBreakdown = Object.fromEntries(
      statusGroups.map((g) => [g.status, g._count._all])
    )
    const moduleBreakdown = Object.fromEntries(
      moduleGroups.map((g) => [g.module, g._count._all])
    )

    return NextResponse.json(
      {
        stats: {
          total: totalCount,
          active: activeCount,
          completed: completedCount,
          cancelled: cancelledCount,
          avgResolution: avgResolutionDays,
          onTimeRate,
          cancellationRate,
          statusBreakdown,
          moduleBreakdown,
        },
        pendingApprovals: pendingApprovalsCount,
        overdueItems: overdueCount,
        requests: recentRequests.map((r) => ({
          id: r.id,
          module: r.module,
          title: r.title,
          status: r.status,
          requesterId: r.requesterId,
          requesterName: r.requester.name ?? 'Unknown',
          requesterEmail: r.requester.email ?? '',
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        })),
      },
      {
        headers: {
          'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=120',
        },
      }
    )
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
