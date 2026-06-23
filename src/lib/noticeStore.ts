import fs from "fs"
import path from "path"

export type NoticeType = "feature" | "bug_fix" | "update"

export interface SystemNotice {
  id: string
  title: string
  type: NoticeType
  summary: string
  description?: string
  postedAt: string
  postedBy?: string // user email who created it
  lastUpdatedAt?: string
}

export interface NoticeStoreData {
  notices: SystemNotice[]
}

const STORE_PATH = path.join(process.cwd(), "data", "notices.json")

const DEFAULT_DATA: NoticeStoreData = {
  notices: [
    {
      id: "notice-event-live",
      title: "Event Module Now Live",
      type: "feature",
      summary: "Event request management now available with full workflow including date, attendees, and location tracking.",
      description:
        "The Event module is now fully operational with all features including:\n- Event date and time scheduling\n- Attendee count tracking\n- Internal/External location types\n- Full approval workflow\n- Comment and attachment support",
      postedAt: new Date("2026-06-11").toISOString(),
      postedBy: "System",
      lastUpdatedAt: new Date("2026-06-11").toISOString(),
    },
    {
      id: "notice-announcements-page",
      title: "Announcements Page Available",
      type: "feature",
      summary: "New page to manage system-wide announcements and communications with scheduling and templates.",
      description:
        "The Announcements feature enables admins to:\n- Create and send company-wide announcements\n- Use pre-built templates for common messages\n- Schedule announcements for specific times\n- Track sent announcements and delivery status\n- Manage announcement drafts",
      postedAt: new Date("2026-05-18").toISOString(),
      postedBy: "System",
      lastUpdatedAt: new Date("2026-05-18").toISOString(),
    },
    {
      id: "notice-cc-visibility",
      title: "CC Request Visibility Toggle",
      type: "feature",
      summary: "Users can now discover requests they're CC'd on across all modules with a convenient toggle switch.",
      description:
        "New CC visibility feature allows users to:\n- Toggle display of requests where they are CC'd\n- See requests from colleagues that require their input\n- Access to the same list pages (Shipping, HR, Purchase, Event, Travel, General, Maintenance)\n- Separate view from their own submitted requests",
      postedAt: new Date("2026-06-23").toISOString(),
      postedBy: "System",
      lastUpdatedAt: new Date("2026-06-23").toISOString(),
    },
    {
      id: "notice-travel-complete",
      title: "Travel Module Complete",
      type: "feature",
      summary: "Complete travel request system with visa and hotel/flight booking types is now available.",
      description:
        "The Travel module now includes:\n- Multiple trip types (flights, hotels, visas)\n- Date and destination tracking\n- Budget and cost management\n- Approval workflows\n- Document attachment support\n- Travel history and reporting",
      postedAt: new Date("2026-05-18").toISOString(),
      postedBy: "System",
      lastUpdatedAt: new Date("2026-05-18").toISOString(),
    },
    {
      id: "notice-shipping-id-fix",
      title: "Fixed Shipping Request ID Duplicates",
      type: "bug_fix",
      summary: "Resolved issue where concurrent submissions could create duplicate request IDs in shipping module.",
      description:
        "A critical issue has been fixed:\n- Root cause: Race condition in concurrent request submission\n- Solution: Implemented server-side atomic ID generation\n- Impact: All new requests now have guaranteed unique IDs\n- Status: Deployed and verified across all modules",
      postedAt: new Date("2026-06-10").toISOString(),
      postedBy: "System",
      lastUpdatedAt: new Date("2026-06-10").toISOString(),
    },
    {
      id: "notice-attachment-loss-fix",
      title: "Fixed Attachment Loss on Submit",
      type: "bug_fix",
      summary: "Resolved attachment loss when localStorage storage limit was exceeded during form submission.",
      description:
        "Fixed storage quota issue:\n- Root cause: localStorage overflow when saving attachments\n- Solution: Implement graceful quota handling and server-side persistence\n- Workaround: Attachments now persisted to server immediately\n- Users can safely upload large files without data loss",
      postedAt: new Date("2026-06-08").toISOString(),
      postedBy: "System",
      lastUpdatedAt: new Date("2026-06-08").toISOString(),
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

function normalizeNotice(notice: Partial<SystemNotice>): SystemNotice {
  return {
    id: notice.id ?? `notice-${Date.now()}`,
    title: notice.title ?? "Untitled Notice",
    type: notice.type ?? "update",
    summary: notice.summary ?? "",
    description: notice.description,
    postedAt: notice.postedAt ?? new Date().toISOString(),
    postedBy: notice.postedBy,
    lastUpdatedAt: notice.lastUpdatedAt ?? new Date().toISOString(),
  }
}

export function readNoticeStore(): NoticeStoreData {
  try {
    ensureStore()
    const data = JSON.parse(fs.readFileSync(STORE_PATH, "utf-8"))
    if (!Array.isArray(data?.notices)) {
      return DEFAULT_DATA
    }
    return {
      notices: data.notices.map(normalizeNotice),
    }
  } catch {
    return DEFAULT_DATA
  }
}

export function writeNoticeStore(data: NoticeStoreData) {
  ensureStore()
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf-8")
}

export function createNotice(notice: Omit<SystemNotice, "id" | "lastUpdatedAt">): SystemNotice {
  const data = readNoticeStore()
  const newNotice = normalizeNotice({
    ...notice,
    id: `notice-${Date.now()}`,
    lastUpdatedAt: new Date().toISOString(),
  })
  data.notices.unshift(newNotice)
  writeNoticeStore(data)
  return newNotice
}

export function updateNotice(id: string, updates: Partial<SystemNotice>): SystemNotice | null {
  const data = readNoticeStore()
  const idx = data.notices.findIndex((n) => n.id === id)
  if (idx < 0) return null

  const updated = normalizeNotice({
    ...data.notices[idx],
    ...updates,
    id, // preserve ID
    lastUpdatedAt: new Date().toISOString(),
  })
  data.notices[idx] = updated
  writeNoticeStore(data)
  return updated
}

export function deleteNotice(id: string): boolean {
  const data = readNoticeStore()
  const before = data.notices.length
  data.notices = data.notices.filter((n) => n.id !== id)
  if (data.notices.length === before) return false
  writeNoticeStore(data)
  return true
}

export function getNoticeById(id: string): SystemNotice | null {
  const data = readNoticeStore()
  return data.notices.find((n) => n.id === id) ?? null
}

export function getAllNotices(): SystemNotice[] {
  const data = readNoticeStore()
  return data.notices
}
