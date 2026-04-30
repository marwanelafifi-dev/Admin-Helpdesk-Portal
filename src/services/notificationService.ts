import { prisma } from '@/lib/prisma'

/**
 * Create a notification
 */
export async function createNotification(params: {
  userId: string
  type: string
  title: string
  description: string
  requestId?: string
  commentId?: string
  actionUrl?: string
}) {
  const { userId, type, title, description, requestId, commentId, actionUrl } =
    params

  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      description,
      requestId: requestId || null,
      commentId: commentId || null,
      actionUrl: actionUrl || null,
    },
  })

  return notification
}

/**
 * Notify on status change
 */
export async function notifyOnStatusChange(params: {
  requestId: string
  oldStatus: string
  newStatus: string
  changedByUserId: string
  request: {
    title: string
    module: string
  }
}) {
  const { requestId, oldStatus, newStatus, changedByUserId, request } = params

  const title = `Status Changed: ${oldStatus} → ${newStatus}`
  const description = `${request.title} status was updated by you`
  const actionUrl = `/requests/${requestId}`

  // Get request requester and approvers
  const dbRequest = await prisma.request.findUnique({
    where: { id: requestId },
    select: {
      requesterId: true,
      approvals: {
        select: { approverId: true },
      },
    },
  })

  if (!dbRequest) return

  // Notify requester
  if (dbRequest.requesterId !== changedByUserId) {
    await createNotification({
      userId: dbRequest.requesterId,
      type: 'status_change',
      title,
      description,
      requestId,
      actionUrl,
    })
  }

  // Notify approvers
  for (const approval of dbRequest.approvals) {
    if (approval.approverId !== changedByUserId) {
      await createNotification({
        userId: approval.approverId,
        type: 'status_change',
        title,
        description,
        requestId,
        actionUrl,
      })
    }
  }
}

/**
 * Notify on comment added
 */
export async function notifyOnComment(params: {
  requestId: string
  commentId: string
  authorId: string
  preview: string
}) {
  const { requestId, commentId, authorId, preview } = params

  const author = await prisma.user.findUnique({
    where: { id: authorId },
    select: { name: true },
  })

  const title = `New Comment: ${preview.substring(0, 50)}...`
  const description = `${author?.name} commented on your request`
  const actionUrl = `/requests/${requestId}?tab=comments`

  // Get all previous commenters + requester + approvers
  const dbRequest = await prisma.request.findUnique({
    where: { id: requestId },
    select: {
      requesterId: true,
      approvals: {
        select: { approverId: true },
      },
      comments: {
        where: {
          id: { not: commentId },
        },
        select: { authorId: true },
        distinct: ['authorId'],
      },
    },
  })

  if (!dbRequest) return

  const userIds = new Set<string>()
  userIds.add(dbRequest.requesterId)

  for (const approval of dbRequest.approvals) {
    userIds.add(approval.approverId)
  }

  for (const comment of dbRequest.comments) {
    userIds.add(comment.authorId)
  }

  // Remove the comment author
  userIds.delete(authorId)

  // Notify all
  for (const userId of userIds) {
    await createNotification({
      userId,
      type: 'comment_added',
      title,
      description,
      commentId,
      requestId,
      actionUrl,
    })
  }
}

/**
 * Notify on mention
 */
export async function notifyOnMention(params: {
  requestId: string
  commentId: string
  authorId: string
  mentionedUserIds: string[]
  preview: string
}) {
  const { requestId, commentId, authorId, mentionedUserIds, preview } = params

  const author = await prisma.user.findUnique({
    where: { id: authorId },
    select: { name: true },
  })

  const title = 'You were mentioned in a comment'
  const description = `${author?.name} mentioned you: ${preview.substring(0, 50)}...`
  const actionUrl = `/requests/${requestId}?tab=comments`

  // Notify mentioned users
  for (const userId of mentionedUserIds) {
    if (userId !== authorId) {
      await createNotification({
        userId,
        type: 'mentioned',
        title,
        description,
        commentId,
        requestId,
        actionUrl,
      })
    }
  }
}

/**
 * Get unread notifications for user
 */
export async function getUnreadNotifications(
  userId: string,
  limit = 10
) {
  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      read: false,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return notifications
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: string) {
  const notification = await prisma.notification.update({
    where: { id: notificationId },
    data: {
      read: true,
      readAt: new Date(),
    },
  })

  return notification
}

/**
 * Get user notification preferences
 */
export async function getNotificationPreferences(userId: string) {
  let prefs = await prisma.notificationPreference.findUnique({
    where: { userId },
  })

  // Create if doesn't exist
  if (!prefs) {
    prefs = await prisma.notificationPreference.create({
      data: { userId },
    })
  }

  return prefs
}

/**
 * Update user notification preferences
 */
export async function updateNotificationPreferences(
  userId: string,
  updates: any
) {
  const prefs = await prisma.notificationPreference.upsert({
    where: { userId },
    create: { userId, ...updates },
    update: updates,
  })

  return prefs
}
