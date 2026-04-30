import { prisma } from '@/lib/prisma'

/**
 * Create a new comment
 */
export async function createComment(params: {
  requestId: string
  content: string
  authorId: string
  mentions?: string[]
}) {
  const { requestId, content, authorId, mentions = [] } = params

  const comment = await prisma.comment.create({
    data: {
      requestId,
      content,
      authorId,
      mentions,
    },
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
  })

  return comment
}

/**
 * Get all comments for a request
 */
export async function getComments(
  requestId: string,
  filters?: {
    limit?: number
    offset?: number
  }
) {
  const { limit = 50, offset = 0 } = filters || {}

  const [comments, total] = await Promise.all([
    prisma.comment.findMany({
      where: { requestId },
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
        replies: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                picture: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      where: { parentCommentId: null }, // Only top-level comments
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.comment.count({
      where: { requestId, parentCommentId: null },
    }),
  ])

  return {
    data: comments,
    total,
    limit,
    offset,
  }
}

/**
 * Update a comment
 */
export async function updateComment(
  commentId: string,
  content: string,
  mentions?: string[]
) {
  const comment = await prisma.comment.update({
    where: { id: commentId },
    data: {
      content,
      mentions: mentions || undefined,
      editedAt: new Date(),
    },
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
  })

  return comment
}

/**
 * Delete a comment
 */
export async function deleteComment(commentId: string) {
  const deleted = await prisma.comment.delete({
    where: { id: commentId },
  })

  return deleted
}

/**
 * Add attachment to comment
 */
export async function addCommentAttachment(params: {
  commentId: string
  name: string
  url: string
  mimeType: string
  sizeBytes: number
}) {
  const { commentId, name, url, mimeType, sizeBytes } = params

  const attachment = await prisma.commentAttachment.create({
    data: {
      commentId,
      name,
      url,
      mimeType,
      sizeBytes,
    },
  })

  return attachment
}

/**
 * Delete comment attachment
 */
export async function deleteCommentAttachment(attachmentId: string) {
  const deleted = await prisma.commentAttachment.delete({
    where: { id: attachmentId },
  })

  return deleted
}
