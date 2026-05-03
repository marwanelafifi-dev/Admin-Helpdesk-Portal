import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/server/engine/prisma'

/**
 * GET /api/requests/[module]
 * Fetch requests for a specific module
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { requestModule: string } }
) {
  try {
    const { requestModule } = params
    const prisma = getPrisma()
    
    const url = new URL(req.url)
    const skip = parseInt(url.searchParams.get("skip") || "0")
    const take = parseInt(url.searchParams.get("take") || "50")
    const status = url.searchParams.get("status")

    const where: any = { module: requestModule }
    
    if (status) {
      where.status = status
    }

    const [requests, total] = await Promise.all([
      prisma.request.findMany({
        where,
        include: { requester: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.request.count({ where }),
    ])

    return NextResponse.json({
      requests,
      total,
      skip,
      take,
      hasMore: skip + take < total,
    })
  } catch (error) {
    console.error("Failed to fetch requests:", error)
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 })
  }
}
