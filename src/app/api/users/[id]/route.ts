import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/server/db'
import { withApiHandler } from '@/lib/api-handler'
import { isValidUserRole, updateUserRole } from '@/lib/user-admin'

/**
 * PATCH /api/users/[id]
 * Update user role (Super Admin only)
 */
export const PATCH = withApiHandler(async (
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
    const { id } = await params

    const userRole = (req as NextRequest).headers.get('x-user-role')
    if (userRole !== 'super_admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { role } = body

    if (!isValidUserRole(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    const user = await updateUserRole(id, role)

    return NextResponse.json(user)
})

/**
 * DELETE /api/users/[id]
 * Remove user from team (Super Admin only)
 */
export const DELETE = withApiHandler(async (
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
    const { id } = await params

    const userRole = (req as NextRequest).headers.get('x-user-role')
    if (userRole !== 'super_admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    await prisma.user.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
})
