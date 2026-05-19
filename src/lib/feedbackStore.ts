import fs from "fs"
import path from "path"

export interface StoredFeedbackSurvey {
  id: string
  requestId: string
  requesterEmail: string
  requesterName: string
  requestTitle: string
  module: string
  status: "pending" | "sent" | "completed"
  rating?: number
  comment?: string
  sentAt?: string
  completedAt?: string
  createdAt: string
}

interface FeedbackData {
  surveys: StoredFeedbackSurvey[]   // pending / sent
  responses: StoredFeedbackSurvey[] // completed
}

const STORE_PATH = path.join(process.cwd(), "data", "feedback.json")

function readFromDisk(): FeedbackData {
  try {
    const dir = path.dirname(STORE_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    if (!fs.existsSync(STORE_PATH)) return { surveys: [], responses: [] }
    const raw = fs.readFileSync(STORE_PATH, "utf-8")
    const parsed = JSON.parse(raw)
    return {
      surveys: Array.isArray(parsed.surveys) ? parsed.surveys : [],
      responses: Array.isArray(parsed.responses) ? parsed.responses : [],
    }
  } catch {
    return { surveys: [], responses: [] }
  }
}

function writeToDisk(data: FeedbackData) {
  try {
    const dir = path.dirname(STORE_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf-8")
  } catch (err) {
    console.error("[FeedbackStore] Failed to persist feedback:", err)
  }
}

class FeedbackStoreManager {
  private data: FeedbackData

  constructor() {
    this.data = readFromDisk()
    console.log(`[FeedbackStore] Loaded ${this.data.surveys.length} pending survey(s), ${this.data.responses.length} response(s) from disk`)
  }

  /** Create a pending survey for a request and persist it. */
  createSurvey(input: Omit<StoredFeedbackSurvey, "id" | "status" | "createdAt">): StoredFeedbackSurvey {
    const survey: StoredFeedbackSurvey = {
      ...input,
      id: `FB-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      status: "pending",
      createdAt: new Date().toISOString(),
    }
    this.data.surveys.push(survey)
    writeToDisk(this.data)
    return survey
  }

  /** Mark a survey as sent (after email send). */
  markSent(id: string): boolean {
    const survey = this.data.surveys.find((s) => s.id === id)
    if (!survey) return false
    survey.status = "sent"
    survey.sentAt = new Date().toISOString()
    writeToDisk(this.data)
    return true
  }

  /** Look up a survey by id — accessible to the public survey page. */
  findSurvey(id: string): StoredFeedbackSurvey | null {
    return this.data.surveys.find((s) => s.id === id)
        ?? this.data.responses.find((r) => r.id === id)
        ?? null
  }

  /** Submit a response: move survey from surveys[] to responses[]. */
  submitResponse(id: string, rating: number, comment: string): StoredFeedbackSurvey | null {
    const idx = this.data.surveys.findIndex((s) => s.id === id)
    if (idx === -1) {
      // Already-completed survey can't be resubmitted
      return null
    }
    const survey = this.data.surveys[idx]
    const response: StoredFeedbackSurvey = {
      ...survey,
      rating,
      comment,
      status: "completed",
      completedAt: new Date().toISOString(),
    }
    this.data.surveys.splice(idx, 1)
    this.data.responses.push(response)
    writeToDisk(this.data)
    return response
  }

  /** All completed responses — used by Feedback & Reports. */
  getResponses(): StoredFeedbackSurvey[] {
    return [...this.data.responses]
  }

  /** Clear everything — for Admin Database wipe operations. */
  clearAll(): void {
    this.data = { surveys: [], responses: [] }
    writeToDisk(this.data)
  }
}

// Singleton across hot-reloads in dev and across requests in prod
declare global {
  // eslint-disable-next-line no-var
  var __feedbackStore: FeedbackStoreManager | undefined
}

export const feedbackStore: FeedbackStoreManager =
  globalThis.__feedbackStore ?? (globalThis.__feedbackStore = new FeedbackStoreManager())
