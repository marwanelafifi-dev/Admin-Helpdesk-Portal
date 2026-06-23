import fs from "fs"
import path from "path"

export type FeedbackCategory = "general" | "bug" | "feature_request" | "ui_ux"
export type FeedbackStatus = "new" | "in_progress" | "completed" | "resolved" | "cancelled"

export interface Attachment {
  id: string
  name: string
  type: string
  size: number
  url: string
  uploadedAt: string
}

export interface UserFeedback {
  id: string
  userId: string
  userEmail: string
  userName: string
  category: FeedbackCategory
  title: string
  comment: string
  status: FeedbackStatus
  createdAt: string
  rating?: number // 1-5 stars
  attachments?: Attachment[]
}

const FEEDBACK_FILE = path.join(process.cwd(), "data", "user-feedback.json")

function ensureDir() {
  const dir = path.dirname(FEEDBACK_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function readFeedback(): UserFeedback[] {
  ensureDir()
  try {
    if (!fs.existsSync(FEEDBACK_FILE)) {
      return []
    }
    const data = fs.readFileSync(FEEDBACK_FILE, "utf-8")
    return JSON.parse(data) || []
  } catch {
    return []
  }
}

function writeFeedback(feedback: UserFeedback[]) {
  ensureDir()
  fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(feedback, null, 2))
}

export const userFeedbackStore = {
  getAll(): UserFeedback[] {
    return readFeedback()
  },

  getById(id: string): UserFeedback | undefined {
    return readFeedback().find((f) => f.id === id)
  },

  getByUser(userEmail: string): UserFeedback[] {
    return readFeedback().filter((f) => f.userEmail.toLowerCase() === userEmail.toLowerCase())
  },

  getByStatus(status: FeedbackStatus): UserFeedback[] {
    return readFeedback().filter((f) => f.status === status)
  },

  create(feedback: Omit<UserFeedback, "id" | "createdAt">): UserFeedback {
    const all = readFeedback()
    const newFeedback: UserFeedback = {
      ...feedback,
      id: `FB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    }
    all.push(newFeedback)
    writeFeedback(all)
    return newFeedback
  },

  updateStatus(id: string, status: FeedbackStatus): UserFeedback | null {
    const all = readFeedback()
    const index = all.findIndex((f) => f.id === id)
    if (index === -1) return null
    all[index].status = status
    writeFeedback(all)
    return all[index]
  },

  delete(id: string): boolean {
    const all = readFeedback()
    const filtered = all.filter((f) => f.id !== id)
    if (filtered.length === all.length) return false
    writeFeedback(filtered)
    return true
  },

  deleteByUser(userEmail: string): number {
    const all = readFeedback()
    const filtered = all.filter((f) => f.userEmail.toLowerCase() !== userEmail.toLowerCase())
    const deleted = all.length - filtered.length
    writeFeedback(filtered)
    return deleted
  },

  deleteAll(): number {
    const all = readFeedback()
    const count = all.length
    writeFeedback([])
    return count
  },
}
