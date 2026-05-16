import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { getPrisma } from '@/server/engine/prisma'

const querySchema = z.object({
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(100).default(50),
  status: z.string().optional(),
})

/**
 * GET /api/requests/[module]
 * Fetch requests for a specific module
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ module: string }> }
) {
  try {
    const { module } = await context.params
    const prisma = getPrisma()

    const url = new URL(req.url)
    const parsed = querySchema.safeParse({
      skip: url.searchParams.get("skip") ?? undefined,
      take: url.searchParams.get("take") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
    })

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { skip, take, status } = parsed.data

    const where: Prisma.RequestWhereInput = { module }

    if (status) {
      where.status = status as Prisma.EnumRequestStatusFilter
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
