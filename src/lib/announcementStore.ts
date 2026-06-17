import fs from "fs"
import path from "path"

export type AnnouncementAttachment = {
  id: string
  name: string
  url: string
  mimeType: string
  sizeBytes: number
  uploadedAt: string
}

export type AnnouncementMessage = {
  id: string
  subject: string
  body: string
  to: string[]
  cc: string[]
  includeAllCompany: boolean
  attachments: AnnouncementAttachment[]
  createdBy: string
  createdByEmail: string
  createdAt: string
  updatedAt: string
}

export type AnnouncementSent = AnnouncementMessage & {
  sentAt: string
  recipientCount: number
}

export type AnnouncementDraft = AnnouncementMessage

export type AnnouncementTemplate = {
  id: string
  name: string
  subject: string
  body: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type AnnouncementStoreData = {
  sent: AnnouncementSent[]
  drafts: AnnouncementDraft[]
  templates: AnnouncementTemplate[]
}

const STORE_PATH = path.join(process.cwd(), "data", "announcements.json")

const DEFAULT_DATA: AnnouncementStoreData = {
  sent: [],
  drafts: [],
  templates: [
    {
      id: "tpl-doctor-available",
      name: "Doctor Available",
      subject: "NOTIFICATION: Medright Doctor Now Available",
      body: "Dear Colleagues,\n\nMedright doctor is now available on the 1st floor, in the Rec. Area.\n\nBest regards,\nAdmin Helpdesk",
      createdBy: "System",
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    },
    {
      id: "tpl-maintenance-window",
      name: "Maintenance Window",
      subject: "NOTIFICATION: Scheduled Maintenance",
      body: "Dear Colleagues,\n\nPlease note that scheduled maintenance will take place on [date] from [time] to [time].\n\nWe apologize for any inconvenience.\n\nBest regards,\nAdmin Helpdesk",
      createdBy: "System",
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    },
  ],
}

function ensureStore() {
  const dir = path.dirname(STORE_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify(DEFAULT_DATA, null, 2), "utf-8")
  }
}

export function readAnnouncementStore(): AnnouncementStoreData {
  try {
    ensureStore()
    const parsed = JSON.parse(fs.readFileSync(STORE_PATH, "utf-8"))
    return {
      sent: Array.isArray(parsed?.sent) ? parsed.sent : [],
      drafts: Array.isArray(parsed?.drafts) ? parsed.drafts : [],
      templates: Array.isArray(parsed?.templates) && parsed.templates.length > 0
        ? parsed.templates
        : DEFAULT_DATA.templates,
    }
  } catch {
    return DEFAULT_DATA
  }
}

function writeAnnouncementStore(data: AnnouncementStoreData) {
  ensureStore()
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf-8")
}

export function saveAnnouncementDraft(draft: AnnouncementDraft): AnnouncementDraft {
  const data = readAnnouncementStore()
  const idx = data.drafts.findIndex((item) => item.id === draft.id)
  if (idx >= 0) data.drafts[idx] = draft
  else data.drafts.unshift(draft)
  writeAnnouncementStore(data)
  return draft
}

export function saveAnnouncementTemplate(template: AnnouncementTemplate): AnnouncementTemplate {
  const data = readAnnouncementStore()
  const idx = data.templates.findIndex((item) => item.id === template.id)
  if (idx >= 0) data.templates[idx] = template
  else data.templates.unshift(template)
  writeAnnouncementStore(data)
  return template
}

export function saveSentAnnouncement(sent: AnnouncementSent): AnnouncementSent {
  const data = readAnnouncementStore()
  data.sent.unshift(sent)
  data.drafts = data.drafts.filter((draft) => draft.id !== sent.id)
  writeAnnouncementStore(data)
  return sent
}

export function deleteAnnouncementRecord(type: "drafts" | "templates", id: string): boolean {
  const data = readAnnouncementStore()
  const before = data[type].length
  data[type] = data[type].filter((item) => item.id !== id) as any
  if (data[type].length === before) return false
  writeAnnouncementStore(data)
  return true
}
