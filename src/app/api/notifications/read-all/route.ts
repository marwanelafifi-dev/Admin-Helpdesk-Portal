import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/server/db'

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read for the current user
 */
export async function PATCH(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 })
    }

    const { count } = await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    })

    return NextResponse.json({ success: true, updated: count })
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error)
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 })
  }
}
