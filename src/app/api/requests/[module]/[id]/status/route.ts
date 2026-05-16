import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth/options'
import { getPrisma } from '@/server/engine/prisma'
import { sendStatusChangeNotification, sendEmailAsync } from '@/lib/mailer'

interface StatusHistoryEntry {
  status: string
  changedBy: string
  changedAt: string
  comment?: string
}

const BodySchema = z.object({
  status: z.string().min(1),
  comment: z.string().optional(),
})

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ module: string; id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params

  const bodyParsed = BodySchema.safeParse(await req.json())
  if (!bodyParsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: bodyParsed.error.flatten() },
      { status: 400 }
    )
  }

  const { status, comment } = bodyParsed.data

  try {
    const prisma = getPrisma()

    const currentRequest = await prisma.request.findUnique({
      where: { id },
      include: {
        requester: { select: { id: true, name: true, email: true } },
      },
    })

    if (!currentRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    const prevHistory: StatusHistoryEntry[] = Array.isArray(currentRequest.statusHistory)
      ? (currentRequest.statusHistory as unknown as StatusHistoryEntry[])
      : []

    const updatedRequest = await prisma.request.update({
      where: { id },
      data: {
        status: status as any,
        statusHistory: [
          ...(prevHistory as any[]),
          {
            status,
            changedBy: session.user.id,
            changedByName: session.user.name ?? session.user.email ?? session.user.id,
            changedAt: new Date().toISOString(),
            comment: comment ?? '',
          },
        ] as any,
      },
      include: {
        requester: { select: { id: true, name: true, email: true } },
      },
    })

    // Fetch admin emails for notifications
    const adminUsers = await prisma.user.findMany({
      where: { role: 'admin' },
      select: { email: true },
    })
    const adminEmails = adminUsers.map((u) => u.email).filter(Boolean) as string[]

    if (currentRequest.requester.email) {
      const requestForEmail: any = {
        id: updatedRequest.id,
        module: updatedRequest.module,
        title: updatedRequest.title,
        status: updatedRequest.status,
        requesterId: updatedRequest.requesterId,
        requesterName: updatedRequest.requester.name ?? 'Unknown User',
        requesterEmail: updatedRequest.requester.email!,
        payload: updatedRequest.payload as Record<string, unknown>,
        statusHistory: [],
        createdAt: updatedRequest.createdAt.toISOString(),
        updatedAt: updatedRequest.updatedAt.toISOString(),
      }

      sendEmailAsync(async () => {
        await sendStatusChangeNotification(
          requestForEmail,
          status,
          currentRequest.requester.email!,
          adminEmails,
        )
      })
    }

    await prisma.notification.create({
      data: {
        type: 'request_updated',
        title: `Your request "${updatedRequest.title}" has been updated`,
        message: `Request status changed to ${status}${comment ? `. Comment: ${comment}` : ''}`,
        userId: updatedRequest.requesterId,
        requestId: updatedRequest.id,
        link: `/${updatedRequest.module}?id=${updatedRequest.id}`,
      },
    })

    return NextResponse.json({
      success: true,
      requestId: updatedRequest.id,
      status: updatedRequest.status,
      message: 'Request status updated successfully',
    })
  } catch (error) {
    console.error('Failed to update request status:', error)
    return NextResponse.json({ error: 'Failed to update request status' }, { status: 500 })
  }
}
