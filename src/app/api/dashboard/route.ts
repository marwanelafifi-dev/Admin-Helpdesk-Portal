import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/server/engine/prisma'

/**
 * GET /api/dashboard
 * Fetch comprehensive dashboard data from Prisma database
 */
export async function GET(req: NextRequest) {
  try {
    const prisma = getPrisma()
    
    // Fetch all requests from the database
    const requests = await prisma.request.findMany({
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Calculate dashboard statistics
    const statusBreakdown: Record<string, number> = {}
    const moduleBreakdown: Record<string, number> = {}
    let activeCount = 0
    let completedCount = 0
    let cancelledCount = 0
    let totalResolutionTime = 0

    requests.forEach((request) => {
      const status = request.status
      const moduleName = request.module

      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1
      moduleBreakdown[moduleName] = (moduleBreakdown[moduleName] || 0) + 1

      if (['draft', 'new', 'on_hold', 'in_customs', 'in_transit', 'pending_assignment', 'assigned', 'awaiting_input'].includes(status)) {
        activeCount++
      }

      if (status === 'completed' || status === 'delivered' || status === 'resolved' || status === 'closed') {
        completedCount++
        // Calculate resolution time in days
        const resolutionTime = (new Date(request.updatedAt).getTime() - new Date(request.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        totalResolutionTime += resolutionTime
      }

      if (status === 'cancelled') {
        cancelledCount++
      }
    })

    const avgResolutionDays = completedCount > 0 ? Math.round(totalResolutionTime / completedCount) : 0
    const onTimeRate = requests.length > 0 ? Math.round((completedCount / requests.length) * 100) : 0

    // Calculate pending approvals (new and on_hold requests)
    const pendingApprovals = requests.filter(r => r.status === 'new' || r.status === 'on_hold')

    // Calculate overdue items (requests older than 7 days and not completed/cancelled/delivered)
    const now = new Date()
    const overdueItems = requests.filter(r => {
      if (['completed', 'cancelled', 'delivered', 'resolved', 'closed'].includes(r.status)) return false
      const createdDate = new Date(r.createdAt)
      const daysSinceCreation = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
      return daysSinceCreation > 7
    })

    const dashboardData = {
      requests: requests.map(req => ({
        id: req.id,
        module: req.module,
        title: req.title,
        status: req.status,
        payload: req.payload,
        statusHistory: req.statusHistory,
        requesterId: req.requesterId,
        requesterName: req.requester.name || 'Unknown',
        requesterEmail: req.requester.email || '',
        createdAt: req.createdAt.toISOString(),
        updatedAt: req.updatedAt.toISOString(),
      })),
      stats: {
        total: requests.length,
        active: activeCount,
        completed: completedCount,
        cancelled: cancelledCount,
        avgResolution: avgResolutionDays,
        onTimeRate,
        statusBreakdown,
        moduleBreakdown,
      },
      pendingApprovals: pendingApprovals.length,
      overdueItems: overdueItems.length,
    }

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
