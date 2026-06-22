import { readAnnouncementStore, saveAnnouncementTemplate, saveSentAnnouncement } from "@/lib/announcementStore"
import { readUsers } from "@/lib/userStore"
import { sendAnnouncementEmail } from "@/lib/emailService"

// Check every 1 minute whether a scheduled announcement is due.
const CHECK_INTERVAL_MS = 1 * 60 * 1000

// Track which announcements have been sent this session to prevent duplicate sends
// if file persistence has issues
const sentThisSession = new Set<string>()

let started = false

export function startAnnouncementScheduler() {
  if (started) return
  started = true

  console.log("[announcement-scheduler] Started — checking every minute")

  const tick = async () => {
    try {
      const store = readAnnouncementStore()
      const now = new Date()

      for (const template of store.templates) {
        if (!template.autoSendEnabled || !template.scheduledAt) continue

        const scheduledTime = new Date(template.scheduledAt)
        const isDue = now >= scheduledTime

        if (!isDue) continue

        // Skip if already sent (check both file state and session state)
        if (template.lastScheduledSentAt || sentThisSession.has(template.id)) continue

        // Also check if this announcement is already in sent history
        const alreadySent = store.sent.some((s) => s.id === template.id && s.sentAt)
        if (alreadySent) {
          console.log(`[announcement-scheduler] Announcement ${template.name} already in sent history, skipping`)
          sentThisSession.add(template.id)
          continue
        }

        console.log(`[announcement-scheduler] Sending scheduled announcement: ${template.name}`)

        try {
          // Build recipient list (same as send flow)
          const companyRecipients = template.includeAllCompany
            ? readUsers().filter((user) => user.active !== false).map((user) => user.email)
            : []
          const recipients = Array.from(
            new Set([...companyRecipients, ...template.to].map((e) => e.trim().toLowerCase()))
          ).filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))

          if (recipients.length === 0) {
            console.warn(`[announcement-scheduler] No recipients for template ${template.name}`)
            sentThisSession.add(template.id)
            continue
          }

          // Send email
          await sendAnnouncementEmail({
            to: recipients,
            cc: template.cc,
            subject: template.subject,
            body: template.body,
            signature: template.signature,
            signatureLogo: template.signatureLogo,
            senderName: template.createdBy,
            attachments: [],
          })

          const sentAt = new Date().toISOString()

          // Update template with last sent time
          const updated = {
            ...template,
            lastScheduledSentAt: sentAt,
            updatedAt: sentAt,
          }
          saveAnnouncementTemplate(updated)

          // Record in sent history
          saveSentAnnouncement({
            ...template,
            sentAt,
            recipientCount: recipients.length,
          })

          // Mark as sent in session to prevent re-sending if file I/O fails
          sentThisSession.add(template.id)

          console.log(`[announcement-scheduler] ✓ Sent: ${template.name} to ${recipients.length} recipients`)
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err)
          console.error(`[announcement-scheduler] Failed to send ${template.name}: ${errorMsg}`)
          // Do NOT add to sentThisSession on error — allow retry next tick
        }
      }
    } catch (err) {
      console.error("[announcement-scheduler] Error during scheduled check:", err)
    }
  }

  // Run once on startup in case we missed a window during a restart
  setTimeout(tick, 10_000)
  setInterval(tick, CHECK_INTERVAL_MS)
}
