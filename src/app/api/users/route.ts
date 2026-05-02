import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/server/db'

/**
 * GET /api/users
 * Fetch all users (Super Admin only)
 */
export async function GET(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role')
    if (userRole !== 'super_admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const skip = parseInt(searchParams.get('skip') || '0')
    const take = parseInt(searchParams.get('take') || '50')
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
        skip,
        take,
      }),
      prisma.user.count({ where }),
    ])

    return NextResponse.json({
      users,
      total,
      skip,
      take,
    })
  } catch (error) {
    console.error('Failed to fetch users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}
