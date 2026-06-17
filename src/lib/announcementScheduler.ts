import { readAnnouncementStore, writeAnnouncementStore, type AnnouncementSent } from "./announcementStore"
import { sendAnnouncementEmail } from "./emailService"
import { readUsers } from "./userStore"

const CHECK_INTERVAL_MS = 5 * 60 * 1000
let schedulerStarted = false
let processing = false

function cleanEmails(values: string[]) {
  return Array.from(new Set(values
    .filter(Boolean)
    .map((value) => value.trim().toLowerCase())
    .filter((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))))
}

function nextScheduledDate(date: Date, frequency: "once" | "weekly" | "monthly") {
  const next = new Date(date)
  if (frequency === "weekly") {
    next.setDate(next.getDate() + 7)
  } else if (frequency === "monthly") {
    next.setMonth(next.getMonth() + 1)
  }
  return next
}

export async function processDueAnnouncementTemplates() {
  if (processing) return
  processing = true

  try {
    const data = readAnnouncementStore()
    const users = readUsers().filter((user) => user.active !== false && user.email)
    const now = new Date()
    const nowIso = now.toISOString()
    let changed = false

    for (const template of data.templates) {
      if (!template.autoSendEnabled || !template.scheduledAt) continue

      const scheduledDate = new Date(template.scheduledAt)
      if (Number.isNaN(scheduledDate.getTime()) || scheduledDate > now) continue

      const companyRecipients = template.includeAllCompany ? users.map((user) => user.email) : []
      const recipients = cleanEmails([...companyRecipients, ...template.to])

      if (recipients.length > 0) {
        await sendAnnouncementEmail({
          to: recipients,
          cc: template.cc,
          subject: template.subject,
          body: template.body,
          signature: template.signature,
          signatureLogo: template.signatureLogo,
          senderName: template.createdBy,
        })

        const sent: AnnouncementSent = {
          id: `ANN-${Date.now()}-${template.id}`,
          subject: template.subject,
          body: template.body,
          signature: template.signature,
          signatureLogo: template.signatureLogo,
          to: template.to,
          cc: template.cc,
          includeAllCompany: template.includeAllCompany,
          attachments: [],
          createdBy: template.createdBy,
          createdByEmail: "",
          createdAt: nowIso,
          updatedAt: nowIso,
          sentAt: nowIso,
          recipientCount: recipients.length,
        }
        data.sent.unshift(sent)
      }

      const frequency = template.scheduleFrequency || "once"
      if (frequency === "once") {
        template.autoSendEnabled = false
      } else {
        template.scheduledAt = nextScheduledDate(scheduledDate, frequency).toISOString()
        template.lastScheduledSentAt = nowIso
      }
      template.updatedAt = nowIso
      changed = true
    }

    if (changed) writeAnnouncementStore(data)
  } catch (error) {
    console.error("Announcement template scheduler failed:", error)
  } finally {
    processing = false
  }
}

export function startAnnouncementScheduler() {
  if (schedulerStarted) return
  schedulerStarted = true

  processDueAnnouncementTemplates()
  setInterval(processDueAnnouncementTemplates, CHECK_INTERVAL_MS)
  console.log("Announcement template scheduler started")
}
