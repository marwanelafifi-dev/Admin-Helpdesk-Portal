import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/server/db'
import { withApiHandler } from '@/lib/api-handler'
import { getPaginationParams } from '@/lib/pagination'

/**
 * GET /api/users
 * Fetch all users (Super Admin only)
 */
export const GET = withApiHandler(async (req: Request) => {
    const nextReq = req as NextRequest
    const userRole = nextReq.headers.get('x-user-role')
    if (userRole !== 'super_admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(nextReq.url)
    const { page, limit, offset } = getPaginationParams(nextReq.url, { page: 1, limit: 50 })
    const roleParam = searchParams.get('role')

    const VALID_USER_ROLES = [
      "super_admin",
      "admin",
      "manager",
      "employee",
      "external",
    ] as const
    type ValidUserRole = (typeof VALID_USER_ROLES)[number]

    const where =
      roleParam && VALID_USER_ROLES.includes(roleParam as ValidUserRole)
        ? { role: roleParam as ValidUserRole }
        : undefined

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    return NextResponse.json({
      data: users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
})
