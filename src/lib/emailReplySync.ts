import { ImapFlow } from "imapflow"
import { simpleParser } from "mailparser"
import { addInboundEmailReplyAsComment } from "@/lib/inboundEmail"

type SyncedReply = {
  uid: number
  requestId?: string
  commentId?: string
  from?: string
  subject?: string
  status: "comment_added" | "duplicate" | "skipped"
  reason?: string
}

function getImapConfig() {
  const user = process.env.IMAP_USER || process.env.SMTP_USER
  const pass = process.env.IMAP_PASSWORD || process.env.SMTP_PASSWORD

  if (!user || !pass) {
    throw new Error("IMAP_USER/IMAP_PASSWORD or SMTP_USER/SMTP_PASSWORD must be configured")
  }

  return {
    host: process.env.IMAP_HOST || "imap.gmail.com",
    port: parseInt(process.env.IMAP_PORT || "993", 10),
    secure: process.env.IMAP_SECURE !== "false",
    auth: { user, pass },
  }
}

function normalizeFromAddress(from?: string): string {
  if (!from) return ""
  const match = from.match(/<([^>]+)>/)
  return (match?.[1] || from).trim().toLowerCase()
}

function headerValue(headers: Map<string, unknown>, key: string) {
  const value = headers.get(key.toLowerCase())
  if (Array.isArray(value)) return value.map(String)
  return value ? String(value) : undefined
}

function addressText(value: unknown) {
  if (!value) return undefined
  if (typeof value === "string") return value
  if (typeof value === "object" && "text" in value) {
    return String((value as { text?: string }).text || "")
  }
  return String(value)
}

export async function syncInboundEmailReplies() {
  const client = new ImapFlow({
    ...getImapConfig(),
    logger: false,
  })

  const synced: SyncedReply[] = []

  await client.connect()
  try {
    const lock = await client.getMailboxLock("INBOX")
    try {
      const since = new Date()
      since.setDate(since.getDate() - parseInt(process.env.EMAIL_REPLY_SYNC_DAYS || "7", 10))

      const searchResult = await client.search({ since })
      const uids = Array.isArray(searchResult) ? searchResult : []

      for (const uid of uids) {
        const message = await client.fetchOne(uid, {
          source: true,
          envelope: true,
        })

        if (!message || !message.source) continue

        const parsed = await simpleParser(message.source)
        const toText = [
          addressText(parsed.to),
          addressText(parsed.cc),
          addressText(parsed.bcc),
        ]
          .filter(Boolean)
          .join(", ")

        const subject = parsed.subject || message.envelope?.subject || ""
        const fromAddress = normalizeFromAddress(addressText(parsed.from))

        // Skip emails sent BY the system itself (outbound notifications landing back in inbox)
        const systemAddress = (process.env.SMTP_USER || "").toLowerCase()
        const systemFrom = (process.env.SMTP_FROM || "").toLowerCase()
        const isFromSystem =
          systemAddress && (
            fromAddress.toLowerCase().includes(systemAddress) ||
            systemFrom.includes(fromAddress.toLowerCase())
          )

        if (isFromSystem) {
          synced.push({
            uid,
            from: addressText(parsed.from),
            subject,
            status: "skipped",
            reason: "Sent by the system itself",
          })
          continue
        }

        // Skip if the email body / subject matches a system notification
        // pattern, regardless of which account it's coming from. Notifications
        // routinely land back in the inbox via Gmail filters, forwarding rules,
        // or when the requester and the system share an alias — and if we
        // treat them as comments, every status change spawns a phantom
        // "user comment" in the request thread.
        const bodyText = (parsed.text || "").trim()
        const NOTIFICATION_BODY_MARKERS = [
          /NEW COMMENT ADDED/i,
          /updated a request in the Admin Helpdesk Portal/i,
          /\bRequest ID\s*[:#]?\s*[A-Z]{2,5}-\d{4}-\d+\b/,
          /Open request \[https?:/i,
        ]
        const looksLikeNotificationBody = NOTIFICATION_BODY_MARKERS.some((re) => re.test(bodyText))
        const looksLikeNotificationSubject = /^(Request|New comment|Status update|Feedback survey)/i.test(subject)

        if (looksLikeNotificationBody || (looksLikeNotificationSubject && bodyText.length < 50)) {
          synced.push({
            uid,
            from: addressText(parsed.from),
            subject,
            status: "skipped",
            reason: "Looks like a system notification",
          })
          continue
        }

        const isRequestReply =
          /\+request-[a-z0-9-]+@/i.test(toText) ||
          /\b[A-Z]{2,5}-\d{4}-\d{4,}\b/i.test(subject) ||
          Boolean(headerValue(parsed.headers, "x-arp-request-id"))

        if (!isRequestReply) {
          synced.push({
            uid,
            from: addressText(parsed.from),
            subject,
            status: "skipped",
            reason: "Not a request reply",
          })
          continue
        }

        const result = addInboundEmailReplyAsComment({
          from: addressText(parsed.from),
          to: toText,
          subject,
          text: parsed.text || undefined,
          html: typeof parsed.html === "string" ? parsed.html : undefined,
          messageId: parsed.messageId,
          headers: {
            "x-arp-request-id": headerValue(parsed.headers, "x-arp-request-id"),
          },
        })

        if (result.ok) {
          await client.messageFlagsAdd(uid, ["\\Seen"])
          synced.push({
            uid,
            requestId: result.requestId,
            commentId: result.comment.id,
            from: addressText(parsed.from),
            subject,
            status: result.duplicate ? "duplicate" : "comment_added",
          })
        } else {
          synced.push({
            uid,
            from: addressText(parsed.from),
            subject,
            status: "skipped",
            reason: result.reason,
          })
        }
      }
    } finally {
      lock.release()
    }
  } finally {
    await client.logout()
  }

  return synced
}
