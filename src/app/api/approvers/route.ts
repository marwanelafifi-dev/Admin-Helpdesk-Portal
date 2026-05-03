import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/server/engine/prisma'

/**
 * GET /api/approvers
 * Fetch users for approvers dropdown
 * Returns all users, prioritized by role (admin/manager first)
 */
export async function GET(req: NextRequest) {
  try {
    const prisma = getPrisma()
    
    // Fetch all users with their roles
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: [
        // Prioritize admin and manager roles
        { role: 'asc' }, // This will order by enum: admin, employee, external, manager, super_admin
        { name: 'asc' },
      ],
    })

    // Sort to put admin/manager roles first
    const prioritizedUsers = users.sort((a, b) => {
      const rolePriority = { admin: 1, manager: 2, super_admin: 3, employee: 4, external: 5 }
      const aPriority = rolePriority[a.role as keyof typeof rolePriority] || 999
      const bPriority = rolePriority[b.role as keyof typeof rolePriority] || 999
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority
      }
      
      return (a.name || '').localeCompare(b.name || '')
    })

    return NextResponse.json({
      users: prioritizedUsers,
    })
  } catch (error) {
    console.error('Failed to fetch approvers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch approvers' },
      { status: 500 }
    )
  }
}
