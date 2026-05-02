import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/server/db'
import { sendEmail, emailTemplates } from '@/server/email'

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

    // 3. Send email to admin team
    const adminEmails = (
      process.env.NOTIFICATION_EMAIL_ADMINS || ''
    )
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean)

    if (adminEmails.length > 0) {
      const emailTemplate = emailTemplates.newRequest(
        userName || 'Unknown User',
        title,
        module,
        `${process.env.NEXTAUTH_URL}/${module}?id=${request.id}`
      )

      await sendEmail({
        to: adminEmails,
        ...emailTemplate,
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
