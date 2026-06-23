import fs from "fs"
import path from "path"

export type SurveyCategory = "general" | "bug" | "feature_request" | "ui_ux"
export type SurveyStatus = "new" | "in_progress" | "completed" | "resolved" | "cancelled"

export interface Attachment {
  id: string
  name: string
  type: string
  size: number
  url: string
  uploadedAt: string
}

export interface AdminSurvey {
  id: string
  userId: string
  userEmail: string
  userName: string
  category: SurveyCategory
  title: string
  comment: string
  status: SurveyStatus
  createdAt: string
  rating?: number // 1-5 stars
  attachments?: Attachment[]
}

const SURVEY_FILE = path.join(process.cwd(), "data", "admin-survey.json")

function ensureDir() {
  const dir = path.dirname(SURVEY_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function readSurvey(): AdminSurvey[] {
  ensureDir()
  try {
    if (!fs.existsSync(SURVEY_FILE)) {
      return []
    }
    const data = fs.readFileSync(SURVEY_FILE, "utf-8")
    return JSON.parse(data) || []
  } catch {
    return []
  }
}

function writeSurvey(surveys: AdminSurvey[]) {
  ensureDir()
  fs.writeFileSync(SURVEY_FILE, JSON.stringify(surveys, null, 2))
}

export const adminSurveyStore = {
  getAll(): AdminSurvey[] {
    return readSurvey()
  },

  getById(id: string): AdminSurvey | undefined {
    return readSurvey().find((s) => s.id === id)
  },

  getByUser(userEmail: string): AdminSurvey[] {
    return readSurvey().filter((s) => s.userEmail.toLowerCase() === userEmail.toLowerCase())
  },

  getByStatus(status: SurveyStatus): AdminSurvey[] {
    return readSurvey().filter((s) => s.status === status)
  },

  create(survey: Omit<AdminSurvey, "id" | "createdAt">): AdminSurvey {
    const all = readSurvey()
    const newSurvey: AdminSurvey = {
      ...survey,
      id: `SRV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    }
    all.push(newSurvey)
    writeSurvey(all)
    return newSurvey
  },

  updateStatus(id: string, status: SurveyStatus): AdminSurvey | null {
    const all = readSurvey()
    const index = all.findIndex((s) => s.id === id)
    if (index === -1) return null
    all[index].status = status
    writeSurvey(all)
    return all[index]
  },

  delete(id: string): boolean {
    const all = readSurvey()
    const filtered = all.filter((s) => s.id !== id)
    if (filtered.length === all.length) return false
    writeSurvey(filtered)
    return true
  },

  deleteByUser(userEmail: string): number {
    const all = readSurvey()
    const filtered = all.filter((s) => s.userEmail.toLowerCase() !== userEmail.toLowerCase())
    const deleted = all.length - filtered.length
    writeSurvey(filtered)
    return deleted
  },

  deleteAll(): number {
    const all = readSurvey()
    const count = all.length
    writeSurvey([])
    return count
  },
}
