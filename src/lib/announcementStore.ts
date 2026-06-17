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
  signature: string
  signatureLogo?: string
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
  signature: string
  signatureLogo?: string
  to: string[]
  cc: string[]
  includeAllCompany: boolean
  autoSendEnabled: boolean
  scheduleFrequency?: "once" | "weekly" | "monthly"
  scheduledAt?: string
  lastScheduledSentAt?: string
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
export const DEFAULT_ANNOUNCEMENT_SIGNATURE =
  "Admin Helpdesk\nAdministration Team\n+202 2268 4704\n\nBest regards,\nAdmin Helpdesk Portal\n\nThis message and any attachments are confidential and may be privileged or otherwise protected from disclosure. If you are not the intended recipient, please telephone or mail the sender and delete this message and any attachment from your system."

const DEFAULT_DATA: AnnouncementStoreData = {
  sent: [],
  drafts: [],
  templates: [
    {
      id: "tpl-doctor-available",
      name: "Doctor Available",
      subject: "NOTIFICATION: Medright Doctor Now Available",
      body: "Dear Colleagues,\n\nMedright doctor is now available on the 1st floor, in the Rec. Area.\n\nBest regards,\nAdmin Helpdesk",
      signature: DEFAULT_ANNOUNCEMENT_SIGNATURE,
      to: ["eg.team@si-ware.com"],
      cc: [],
      includeAllCompany: false,
      autoSendEnabled: false,
      createdBy: "System",
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    },
    {
      id: "tpl-maintenance-window",
      name: "Maintenance Window",
      subject: "NOTIFICATION: Scheduled Maintenance",
      body: "Dear Colleagues,\n\nPlease note that scheduled maintenance will take place on [date] from [time] to [time].\n\nWe apologize for any inconvenience.\n\nBest regards,\nAdmin Helpdesk",
      signature: DEFAULT_ANNOUNCEMENT_SIGNATURE,
      to: ["eg.team@si-ware.com"],
      cc: [],
      includeAllCompany: false,
      autoSendEnabled: false,
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
      sent: Array.isArray(parsed?.sent) ? parsed.sent.map(normalizeMessage) : [],
      drafts: Array.isArray(parsed?.drafts) ? parsed.drafts.map(normalizeMessage) : [],
      templates: Array.isArray(parsed?.templates) && parsed.templates.length > 0
        ? parsed.templates.map(normalizeTemplate)
        : DEFAULT_DATA.templates,
    }
  } catch {
    return DEFAULT_DATA
  }
}

export function writeAnnouncementStore(data: AnnouncementStoreData) {
  ensureStore()
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf-8")
}

function normalizeMessage<T extends Partial<AnnouncementMessage>>(message: T): T & AnnouncementMessage {
  return {
    ...message,
    signature: typeof message.signature === "string" ? message.signature : DEFAULT_ANNOUNCEMENT_SIGNATURE,
    signatureLogo: typeof message.signatureLogo === "string" ? message.signatureLogo : undefined,
    to: Array.isArray(message.to) ? message.to : [],
    cc: Array.isArray(message.cc) ? message.cc : [],
    includeAllCompany: Boolean(message.includeAllCompany),
    attachments: Array.isArray(message.attachments) ? message.attachments : [],
  } as T & AnnouncementMessage
}

function normalizeTemplate(template: Partial<AnnouncementTemplate>): AnnouncementTemplate {
  return {
    id: template.id ?? `tpl-${Date.now()}`,
    name: template.name ?? "Untitled Template",
    subject: template.subject ?? "",
    body: template.body ?? "",
    signature: typeof template.signature === "string" ? template.signature : DEFAULT_ANNOUNCEMENT_SIGNATURE,
    signatureLogo: typeof template.signatureLogo === "string" ? template.signatureLogo : undefined,
    to: Array.isArray(template.to) ? template.to : ["eg.team@si-ware.com"],
    cc: Array.isArray(template.cc) ? template.cc : [],
    includeAllCompany: Boolean(template.includeAllCompany),
    autoSendEnabled: Boolean(template.autoSendEnabled),
    scheduleFrequency: template.scheduleFrequency === "weekly" || template.scheduleFrequency === "monthly"
      ? template.scheduleFrequency
      : "once",
    scheduledAt: template.scheduledAt,
    lastScheduledSentAt: template.lastScheduledSentAt,
    createdBy: template.createdBy ?? "System",
    createdAt: template.createdAt ?? new Date().toISOString(),
    updatedAt: template.updatedAt ?? new Date().toISOString(),
  }
}

export function saveAnnouncementDraft(draft: AnnouncementDraft): AnnouncementDraft {
  const data = readAnnouncementStore()
  draft = normalizeMessage(draft)
  const idx = data.drafts.findIndex((item) => item.id === draft.id)
  if (idx >= 0) data.drafts[idx] = draft
  else data.drafts.unshift(draft)
  writeAnnouncementStore(data)
  return draft
}

export function saveAnnouncementTemplate(template: AnnouncementTemplate): AnnouncementTemplate {
  const data = readAnnouncementStore()
  template = normalizeTemplate(template)
  const idx = data.templates.findIndex((item) => item.id === template.id)
  if (idx >= 0) data.templates[idx] = template
  else data.templates.unshift(template)
  writeAnnouncementStore(data)
  return template
}

export function saveSentAnnouncement(sent: AnnouncementSent): AnnouncementSent {
  const data = readAnnouncementStore()
  sent = normalizeMessage(sent) as AnnouncementSent
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
