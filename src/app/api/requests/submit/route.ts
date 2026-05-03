import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/server/engine/prisma'
import { sendNewRequestNotification, sendEmailAsync } from '@/lib/mailer'
import { getAdminEmails } from '@/lib/admin-emails-api'

/**
 * POST /api/requests/submit
 * Handle form submissions from all modules and:
 * 1. Save to database
 * 2. Send notification email to admin team
 * 3. Create notification record
 */
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    const userName = req.headers.get('x-user-name')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const {
      module,
      title,
      status = 'new',
      payload,
    } = body

    if (!module || !title) {
      return NextResponse.json(
        { error: 'Module and title required' },
        { status: 400 }
      )
    }

    const prisma = getPrisma()

    // 1. Save request to database
    const request = await prisma.request.create({
      data: {
        module,
        title,
        status,
        requesterId: userId,
        payload,
      },
    })

    // 2. Create notification for user
    await prisma.notification.create({
      data: {
        type: 'request_submitted',
        title: `Your ${module} request "${title}" has been submitted`,
        message: `Your request has been submitted successfully.`,
        userId,
        requestId: request.id,
        link: `/${module}?id=${request.id}`,
      },
    })

    // 3. Send email to admin team (asynchronously)
    try {
      const adminEmailsResponse = await getAdminEmails()
      const requestForEmail = {
        id: request.id,
        module: request.module,
        title: request.title,
        status: request.status,
        requesterId: request.requesterId,
        requesterName: userName || 'Unknown User',
        requesterEmail: '', // We'll need to fetch this from user record
        payload: request.payload as Record<string, unknown>,
        statusHistory: [], // New requests start with empty status history
        createdAt: request.createdAt.toISOString(),
        updatedAt: request.updatedAt.toISOString(),
      }

      // Send email asynchronously without blocking the response
      sendEmailAsync(async () => {
        await sendNewRequestNotification(requestForEmail, adminEmailsResponse.emails)
      })

      // Create admin notifications
      const admins = await prisma.user.findMany({
        where: { role: { in: ['super_admin', 'admin'] } },
      })

      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            type: 'admin_alert',
            title: `New ${module} Request: ${title}`,
            message: `${userName || 'A user'} submitted a new ${module} request.`,
            userId: admin.id,
            requestId: request.id,
            link: `/admin/all-requests?id=${request.id}`,
          },
        })
      }
    } catch (emailError) {
      console.error('Failed to send admin notifications:', emailError)
      // Don't fail the request if email sending fails
    }

    return NextResponse.json(
      {
        success: true,
        requestId: request.id,
        message: 'Request submitted successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Failed to submit request:', error)
    return NextResponse.json(
      { error: 'Failed to submit request' },
      { status: 500 }
    )
  }
}
