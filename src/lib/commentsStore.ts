// In-memory comments store (temporary until database is set up)
export interface StoredComment {
  id: string
  content: string
  authorId: string
  author?: {
    id: string
    name: string
    email: string
    picture?: string
  }
  attachments?: Array<{
    id: string
    name: string
    url: string
    sizeBytes: number
  }>
  createdAt: string
  updatedAt?: string
}

class CommentsStoreManager {
  private store = new Map<string, StoredComment[]>()

  getComments(requestId: string): StoredComment[] {
    const comments = this.store.get(requestId)
    console.log(`[CommentsStore] getComments(${requestId}):`, comments?.length || 0)
    return comments || []
  }

  addComment(requestId: string, comment: StoredComment): StoredComment {
    const comments = this.store.get(requestId) || []
    comments.unshift(comment)
    this.store.set(requestId, comments)
    console.log(`[CommentsStore] addComment(${requestId}): now has ${comments.length} comments`)
    return comment
  }

  deleteComment(commentId: string): boolean {
    for (const [, comments] of this.store.entries()) {
      const index = comments.findIndex((c) => c.id === commentId)
      if (index > -1) {
        comments.splice(index, 1)
        console.log(`[CommentsStore] deleteComment(${commentId}): deleted`)
        return true
      }
    }
    console.log(`[CommentsStore] deleteComment(${commentId}): not found`)
    return false
  }

  updateComment(commentId: string, content: string): StoredComment | null {
    for (const comments of this.store.values()) {
      const comment = comments.find((c) => c.id === commentId)
      if (comment) {
        comment.content = content
        comment.updatedAt = new Date().toISOString()
        console.log(`[CommentsStore] updateComment(${commentId}): updated`)
        return comment
      }
    }
    return null
  }

  getAllComments(): Map<string, StoredComment[]> {
    return new Map(this.store)
  }
}

// Use a global singleton to persist across requests
declare global {
  var __commentsStore: CommentsStoreManager | undefined
}

export const commentsStore = global.__commentsStore || new CommentsStoreManager()
if (!global.__commentsStore) {
  global.__commentsStore = commentsStore
}
