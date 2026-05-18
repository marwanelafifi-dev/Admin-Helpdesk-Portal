import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/server/db'

const NotificationCreateSchema = z.object({
  type: z.enum([
    'request_submitted',
    'request_approved',
    'request_rejected',
    'request_updated',
    'comment_added',
    'admin_alert',
  ]),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  requestId: z.string().optional(),
  link: z.string().url().optional().or(z.string().startsWith('/').optional()),
})

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const skip = Math.max(0, parseInt(searchParams.get('skip') || '0'))
    const take = Math.min(100, Math.max(1, parseInt(searchParams.get('take') || '20')))
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    const userId = session.user.id
    const where = unreadOnly ? { userId, read: false } : { userId }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.notification.count({ where }),
    ])

    return NextResponse.json({
      notifications,
      total,
      skip,
      take,
      hasMore: skip + take < total,
    })
  } catch (error) {
    console.error('Failed to fetch notifications:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = NotificationCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { type, title, message, requestId, link } = parsed.data

    const notification = await prisma.notification.create({
      data: {
        type,
        title,
        message,
        userId: session.user.id,
        requestId,
        link,
      },
    })

    return NextResponse.json(notification, { status: 201 })
  } catch (error) {
    console.error('Failed to create notification:', error)
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 })
  }
}
