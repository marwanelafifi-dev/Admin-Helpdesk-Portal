import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { REQUEST_STATUSES } from "@/server/engine/constants"
import { getPrisma } from "@/server/engine/prisma"
import { authOptions } from "@/lib/auth"
import { withApiHandler } from "@/lib/api-handler"
import { can } from "@/lib/permissions"

type StatusHistoryEntry = {
  status: string
  changedBy: string
  changedAt: string
  comment?: string
}

function isValidStatus(value: string): boolean {
  return (REQUEST_STATUSES as readonly string[]).includes(value)
}

export const PATCH = withApiHandler(async (req: Request) => {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role
  const userId = session?.user?.id

  if (!role || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!can(role, "updateRequests")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { requestIds, status, comment } = await req.json() as {
    requestIds?: string[]
    status?: string
    comment?: string
  }

  if (!Array.isArray(requestIds) || requestIds.length === 0) {
    return NextResponse.json({ error: "requestIds is required" }, { status: 400 })
  }

  if (!status || !isValidStatus(status)) {
    return NextResponse.json({ error: "Valid status is required" }, { status: 400 })
  }

  const uniqueRequestIds = [...new Set(requestIds)]
  const prisma = getPrisma()
  const requests = await prisma.request.findMany({
    where: { id: { in: uniqueRequestIds } },
    select: {
      id: true,
      title: true,
      module: true,
      requesterId: true,
      statusHistory: true,
    },
  })

  if (requests.length === 0) {
    return NextResponse.json({ error: "No matching requests found" }, { status: 404 })
  }

  const changedAt = new Date().toISOString()

  await prisma.$transaction([
    ...requests.map((request) =>
      prisma.request.update({
        where: { id: request.id },
        data: {
          status: status as any,
          statusHistory: [
            ...((request.statusHistory as StatusHistoryEntry[] | null) ?? []),
            {
              status,
              changedBy: userId,
              changedAt,
              comment: comment ?? "",
            },
          ] as any,
        },
      })
    ),
    prisma.notification.createMany({
      data: requests.map((request) => ({
        type: "request_updated",
        title: `Your request "${request.title}" has been updated`,
        message: `Request status changed to ${status}${comment ? `. Comment: ${comment}` : ""}`,
        userId: request.requesterId,
        requestId: request.id,
        link: `/${request.module}?id=${request.id}`,
      })),
    }),
  ])

  return NextResponse.json({
    success: true,
    updatedCount: requests.length,
    status,
    requestIds: requests.map((request) => request.id),
  })
})
