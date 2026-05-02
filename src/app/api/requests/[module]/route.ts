import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/server/db"
import { sendEmail, emailTemplates } from "@/server/email"
import type { Prisma, RequestStatus } from "@prisma/client"

const VALID_MODULES = [
  "shipping",
  "maintenance",
  "purchase",
  "event",
  "travel",
  "hr",
]

const VALID_REQUEST_STATUSES: RequestStatus[] = [
  "draft",
  "new",
  "on_hold",
  "in_customs",
  "in_transit",
  "delivered",
  "completed",
  "cancelled",
]

function isKnownModule(module: string): boolean {
  return VALID_MODULES.includes(module)
}

async function getAdminEmails(): Promise<string[]> {
  try {
    const admins = await prisma.user.findMany({
      where: { role: { in: ["admin", "super_admin"] } },
      select: { email: true },
    })
    return admins.map((u) => u.email).filter(Boolean) as string[]
  } catch (error) {
    console.error("Failed to fetch admin emails:", error)
    return []
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ module: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { module } = await context.params
    if (!isKnownModule(module)) {
      return NextResponse.json({ error: "Unknown module" }, { status: 404 })
    }

    const url = new URL(request.url)
    const skip = parseInt(url.searchParams.get("skip") || "0")
    const take = parseInt(url.searchParams.get("take") || "50")
    const status = url.searchParams.get("status")

    // Restrict employees to their own requests
    const isEmployee = session.user.role === "employee"
    const where: Prisma.RequestWhereInput = { module }

    if (isEmployee) {
      where.requesterId = session.user.id
    }

    if (status && VALID_REQUEST_STATUSES.includes(status as RequestStatus)) {
      where.status = status as RequestStatus
    }

    const [requests, total] = await Promise.all([
      prisma.request.findMany({
        where,
        include: { requester: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.request.count({ where }),
    ])

    return NextResponse.json({
      requests,
      total,
      skip,
      take,
      hasMore: skip + take < total,
    })
  } catch (error) {
    console.error("Failed to fetch requests:", error)
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ module: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { module } = await context.params
    if (!isKnownModule(module)) {
      return NextResponse.json({ error: "Unknown module" }, { status: 404 })
    }

    const body = await request.json()
    const { title, payload, status = "new" } = body

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    // Create request
    const created = await prisma.request.create({
      data: {
        module,
        title,
        status,
        requesterId: session.user.id,
        payload,
      },
      include: {
        requester: { select: { id: true, name: true, email: true } },
      },
    })

    // Create notification for requester
    await prisma.notification.create({
      data: {
        type: "request_submitted",
        title: `Your ${module} request "${title}" has been submitted`,
        message: "Your request has been submitted successfully.",
        userId: session.user.id,
        requestId: created.id,
        link: `/${module}?id=${created.id}`,
      },
    })

    // Send email to admins and create notifications
    const adminEmails = await getAdminEmails()
    if (adminEmails.length > 0) {
      const emailTemplate = emailTemplates.newRequest(
        session.user.name || "Unknown User",
        title,
        module,
        `${process.env.NEXTAUTH_URL}/${module}?id=${created.id}`
      )

      await sendEmail({
        to: adminEmails,
        ...emailTemplate,
      })

      // Create admin notifications
      const admins = await prisma.user.findMany({
        where: { role: { in: ["super_admin", "admin"] } },
      })

      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            type: "admin_alert",
            title: `New ${module} Request: ${title}`,
            message: `${session.user.name || "A user"} submitted a new ${module} request.`,
            userId: admin.id,
            requestId: created.id,
            link: `/admin/all-requests?id=${created.id}`,
          },
        })
      }
    }

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request body"
    console.error("Failed to create request:", error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
