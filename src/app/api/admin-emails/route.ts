import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/server/engine/prisma'

/**
 * GET /api/admin-emails
 * Fetch emails of all users with ADMIN role for notifications
 */
export async function GET(req: NextRequest) {
  try {
    const prisma = getPrisma()
    
    // Fetch all users with admin or super_admin role
    const adminUsers = await prisma.user.findMany({
      where: {
        role: {
          in: ['admin', 'super_admin']
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    // Extract emails, filtering out null emails
    const adminEmails = adminUsers
      .map(user => user.email)
      .filter((email): email is string => email !== null)

    return NextResponse.json({
      emails: adminEmails,
      count: adminEmails.length,
      users: adminUsers,
    })
  } catch (error) {
    console.error('Failed to fetch admin emails:', error)
    return NextResponse.json(
      { error: 'Failed to fetch admin emails' },
      { status: 500 }
    )
  }
}
