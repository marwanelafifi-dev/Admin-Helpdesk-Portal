import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/server/db'

const ALLOWED_EDITOR_ROLES = ['super_admin', 'admin'] as const
type AllowedEditorRole = (typeof ALLOWED_EDITOR_ROLES)[number]

const VALID_USER_ROLES = [
  'super_admin',
  'admin',
  'manager',
  'employee',
  'external',
] as const
type ValidUserRole = (typeof VALID_USER_ROLES)[number]

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!ALLOWED_EDITOR_ROLES.includes(session.user.role as AllowedEditorRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const roleParam = searchParams.get('role')
    const where =
      roleParam && VALID_USER_ROLES.includes(roleParam as ValidUserRole)
        ? { role: roleParam as ValidUserRole }
        : undefined

    const permissions = await prisma.rolePermission.findMany({
      where,
      orderBy: [{ role: 'asc' }, { permission: 'asc' }],
    })

    const grouped = permissions.reduce(
      (acc, p) => {
        if (!acc[p.role]) acc[p.role] = []
        acc[p.role].push(p)
        return acc
      },
      {} as Record<string, typeof permissions>
    )

    return NextResponse.json(grouped)
  } catch (error) {
    console.error('Failed to fetch role permissions:', error)
    return NextResponse.json({ error: 'Failed to fetch role permissions' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!ALLOWED_EDITOR_ROLES.includes(session.user.role as AllowedEditorRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { role, permission, allowed } = body

    if (!role || !permission) {
      return NextResponse.json({ error: 'Role and permission required' }, { status: 400 })
    }
    if (!VALID_USER_ROLES.includes(role as ValidUserRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const rolePermission = await prisma.rolePermission.upsert({
      where: { role_permission: { role, permission } },
      update: { allowed },
      create: { role, permission, allowed },
    })

    return NextResponse.json(rolePermission, { status: 201 })
  } catch (error) {
    console.error('Failed to save role permission:', error)
    return NextResponse.json({ error: 'Failed to save role permission' }, { status: 500 })
  }
}
