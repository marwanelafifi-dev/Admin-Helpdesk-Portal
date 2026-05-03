import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/server/engine/prisma'
import { sendStatusChangeNotification, sendEmailAsync } from '@/lib/mailer'

/**
 * PUT /api/requests/[requestId]/status
 * Update request status and send notification to requester
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    const { requestId } = params
    const userId = req.headers.get('x-user-id')
    const userName = req.headers.get('x-user-name')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { status, comment } = body

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      )
    }

    const prisma = getPrisma()

    // Get the current request with requester information
    const currentRequest = await prisma.request.findUnique({
      where: { id: requestId },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!currentRequest) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      )
    }

    // Update the request status
    const updatedRequest = await prisma.request.update({
      where: { id: requestId },
      data: {
        status,
        // Update status history
        statusHistory: [
          ...(currentRequest.statusHistory as Array<{
            status: string
            changedBy: string
            changedAt: string
            comment?: string
          }> || []),
          {
            status,
            changedBy: userId,
            changedAt: new Date().toISOString(),
            comment: comment || '',
          },
        ],
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Send email notification to requester (asynchronously)
    if (currentRequest.requester.email) {
      const requestForEmail = {
        id: updatedRequest.id,
        module: updatedRequest.module,
        title: updatedRequest.title,
        status: updatedRequest.status,
        requesterId: updatedRequest.requesterId,
        requesterName: updatedRequest.requester.name || 'Unknown User',
        requesterEmail: updatedRequest.requester.email || '',
        payload: updatedRequest.payload as Record<string, unknown>,
        statusHistory: updatedRequest.statusHistory as any || [],
        createdAt: updatedRequest.createdAt.toISOString(),
        updatedAt: updatedRequest.updatedAt.toISOString(),
      }

      // Send email asynchronously without blocking the response
      sendEmailAsync(async () => {
        await sendStatusChangeNotification(
          requestForEmail,
          status,
          currentRequest.requester.email!
        )
      })
    }

    // Create notification for requester
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
    return NextResponse.json(
      { error: 'Failed to update request status' },
      { status: 500 }
    )
  }
}
