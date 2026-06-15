import fs from "fs"
import path from "path"

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

type CommentsData = Record<string, StoredComment[]>

const STORE_PATH = path.join(process.cwd(), "data", "comments.json")

function readFromDisk(): CommentsData {
  try {
    const dir = path.dirname(STORE_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    if (!fs.existsSync(STORE_PATH)) return {}
    return JSON.parse(fs.readFileSync(STORE_PATH, "utf-8"))
  } catch {
    return {}
  }
}

function writeToDisk(data: CommentsData) {
  try {
    const dir = path.dirname(STORE_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf-8")
  } catch (err) {
    console.error("[CommentsStore] Failed to persist comments:", err)
  }
}

class CommentsStoreManager {
  private store: CommentsData

  constructor() {
    this.store = readFromDisk()
    console.log(`[CommentsStore] Loaded ${Object.keys(this.store).length} request threads from disk`)
  }

  getComments(requestId: string): StoredComment[] {
    return this.store[requestId] || []
  }

  addComment(requestId: string, comment: StoredComment): StoredComment {
    if (!this.store[requestId]) this.store[requestId] = []
    // Prepend (newest first)
    this.store[requestId].unshift(comment)
    writeToDisk(this.store)
    console.log(`[CommentsStore] addComment(${requestId}): now has ${this.store[requestId].length} comments`)
    return comment
  }

  /**
   * Remove every comment attached to a request. Returns the number of
   * comments that were deleted. Used to keep comments in sync when a
   * request is created with a recycled ID — without this, comments from
   * the previous request with the same ID would surface on the new one.
   */
  clearForRequest(requestId: string): number {
    const existing = this.store[requestId]
    if (!existing || existing.length === 0) return 0
    const count = existing.length
    delete this.store[requestId]
    writeToDisk(this.store)
    console.log(`[CommentsStore] clearForRequest(${requestId}): removed ${count} comments`)
    return count
  }

  deleteComment(commentId: string): boolean {
    for (const requestId of Object.keys(this.store)) {
      const index = this.store[requestId].findIndex((c) => c.id === commentId)
      if (index > -1) {
        this.store[requestId].splice(index, 1)
        writeToDisk(this.store)
        console.log(`[CommentsStore] deleteComment(${commentId}): deleted`)
        return true
      }
    }
    return false
  }

  updateComment(commentId: string, content: string): StoredComment | null {
    for (const requestId of Object.keys(this.store)) {
      const comment = this.store[requestId].find((c) => c.id === commentId)
      if (comment) {
        comment.content = content
        comment.updatedAt = new Date().toISOString()
        writeToDisk(this.store)
        console.log(`[CommentsStore] updateComment(${commentId}): updated`)
        return comment
      }
    }
    return null
  }

  getAllComments(): Record<string, StoredComment[]> {
    return { ...this.store }
  }
}

// Global singleton — survives Next.js hot-reload in dev, persists across API calls in prod
declare global {
  var __commentsStore: CommentsStoreManager | undefined
}

export const commentsStore = global.__commentsStore ?? new CommentsStoreManager()
if (!global.__commentsStore) {
  global.__commentsStore = commentsStore
}
