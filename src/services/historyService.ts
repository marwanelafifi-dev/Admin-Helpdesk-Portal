import { prisma } from '@/lib/prisma'

/**
 * Record a change to the audit trail
 */
export async function recordChange(params: {
  requestId: string
  action: string
  fieldName?: string | null
  oldValue?: any
  newValue?: any
  changedByUserId: string
  metadata?: any
}) {
  const {
    requestId,
    action,
    fieldName,
    oldValue,
    newValue,
    changedByUserId,
    metadata,
  } = params

  const history = await prisma.requestHistory.create({
    data: {
      requestId,
      action,
      fieldName: fieldName || null,
      oldValue: oldValue || null,
      newValue: newValue || null,
      changedByUserId,
      metadata: metadata || null,
    },
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
  })

  return history
}

/**
 * Get audit trail for a request
 */
export async function getRequestHistory(
  requestId: string,
  filters?: {
    action?: string
    limit?: number
    offset?: number
  }
) {
  const { action, limit = 50, offset = 0 } = filters || {}

  const where: any = { requestId }
  if (action) where.action = action

  const [history, total] = await Promise.all([
    prisma.requestHistory.findMany({
      where,
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
      take: limit,
      skip: offset,
    }),
    prisma.requestHistory.count({ where }),
  ])

  return {
    data: history,
    total,
    limit,
    offset,
  }
}
