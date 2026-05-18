import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/server/db'
import { withApiHandler } from '@/lib/api-handler'
import { getPaginationParams } from '@/lib/pagination'

export const GET = withApiHandler(async (req: Request) => {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const nextReq = req as NextRequest
  const { searchParams } = new URL(nextReq.url)
  const { page, limit, offset } = getPaginationParams(nextReq.url, { page: 1, limit: 50 })
  const roleParam = searchParams.get('role')

  const VALID_USER_ROLES = [
    'super_admin',
    'admin',
    'manager',
    'employee',
    'external',
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
