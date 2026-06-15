import { prisma } from '@/lib/prisma'

/**
 * Get all requests for a module with optional filters
 */
export async function getRequestsByModule(
  module: string,
  filters?: {
    status?: string
    requesterId?: string
    limit?: number
    offset?: number
  }
) {
  const { status, requesterId, limit = 50, offset = 0 } = filters || {}

  const where: any = { module }

  if (status) where.status = status
  if (requesterId) where.requesterId = requesterId

  const [requests, total] = await Promise.all([
    prisma.request.findMany({
      where,
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
            picture: true,
          },
        },
        approvals: true,
        attachments: true,
        comments: {
          select: {
            id: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.request.count({ where }),
  ])

  return {
    data: requests,
    total,
    limit,
    offset,
  }
}

/**
 * Get single request with all relations
 */
export async function getRequestById(id: string) {
  const request = await prisma.request.findUnique({
    where: { id },
    include: {
      requester: {
        select: {
          id: true,
          name: true,
          email: true,
          picture: true,
          role: true,
        },
      },
      approvals: {
        include: {
          approver: {
            select: {
              id: true,
              name: true,
              email: true,
              picture: true,
            },
          },
        },
      },
      attachments: true,
      comments: {
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              picture: true,
            },
          },
          attachments: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      history: {
        include: {
          changedByUser: {
            select: {
              id: true,
              name: true,
              email: true,
              picture: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  return request
}

/**
 * Create a new request
 */
export async function createRequest(data: {
  module: string
  type?: string
  title: string
  description?: string
  payload: any
  requesterId: string
}) {
  const request = await prisma.request.create({
    data: {
      ...data,
      status: 'new',
    },
    include: {
      requester: {
        select: {
          id: true,
          name: true,
          email: true,
          picture: true,
        },
      },
    },
  })

  return request
}

/**
 * Update request status
 */
export async function updateRequestStatus(
  id: string,
  newStatus: string,
  userId: string
) {
  const request = await prisma.request.findUnique({
    where: { id },
    select: { status: true },
  })

  if (!request) throw new Error('Request not found')

  const oldStatus = request.status

  const updated = await prisma.request.update({
    where: { id },
    data: { status: newStatus },
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

  return { updated, oldStatus }
}

/**
 * Delete request (soft delete via status, or hard delete)
 */
export async function deleteRequest(id: string) {
  const deleted = await prisma.request.delete({
    where: { id },
  })

  return deleted
}
