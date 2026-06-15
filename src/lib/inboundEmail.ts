import { commentsStore } from "@/lib/commentsStore"
import { findUserByEmail } from "@/lib/userStore"
import { createHash } from "crypto"

type InboundEmailAddress = {
  email?: string
  address?: string
  name?: string
}

export type InboundEmailPayload = {
  from?: string | InboundEmailAddress
  to?: string | string[] | InboundEmailAddress | InboundEmailAddress[]
  subject?: string
  text?: string
  html?: string
  headers?: Record<string, string | string[] | undefined>
  messageId?: string
}

function normalizeAddress(value?: string | InboundEmailAddress): string {
  if (!value) return ""
  if (typeof value !== "string") {
    return value.email || value.address || ""
  }

  const match = value.match(/<([^>]+)>/)
  return (match?.[1] || value).trim()
}

function normalizeAddressList(
  value?: string | string[] | InboundEmailAddress | InboundEmailAddress[]
) {
  if (!value) return []
  if (Array.isArray(value)) return value.map(normalizeAddress).filter(Boolean)
  return [normalizeAddress(value)].filter(Boolean)
}

function stripHtml(html?: string) {
  if (!html) return ""
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
}

export function extractRequestIdFromInboundEmail(payload: InboundEmailPayload) {
  const headers = payload.headers || {}
  const headerRequestId = headers["X-ARP-Request-ID"] || headers["x-arp-request-id"]
  if (typeof headerRequestId === "string" && headerRequestId.trim()) {
    return headerRequestId.trim()
  }

  const addresses = normalizeAddressList(payload.to).join(" ")
  const aliasMatch = addresses.match(/\+request-([a-z0-9-]+)@/i)
  if (aliasMatch?.[1]) {
    return aliasMatch[1].toUpperCase()
  }

  const subjectMatch = payload.subject?.match(/\b([A-Z]{2,5}-\d{4}-\d{4,})\b/i)
  if (subjectMatch?.[1]) {
    return subjectMatch[1].toUpperCase()
  }

  const content = `${payload.text || ""}\n${stripHtml(payload.html)}`
  const bodyMatch = content.match(/\b([A-Z]{2,5}-\d{4}-\d{4,})\b/i)
  return bodyMatch?.[1]?.toUpperCase()
}

export function extractReplyText(payload: InboundEmailPayload) {
  const raw = (payload.text || stripHtml(payload.html)).replace(/\r\n/g, "\n").trim()
  if (!raw) return ""

  const lines = raw.split("\n")
  const kept: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    // Stop at quoted reply markers
    if (trimmed.startsWith(">")) break
    if (/^On .+ wrote:$/i.test(trimmed)) break
    if (/^From:\s/i.test(trimmed)) break
    if (/^-{2,}\s*Original Message\s*-{2,}$/i.test(trimmed)) break
    // Stop at system notification content
    if (/^This is an automated notification from Si-Ware/i.test(trimmed)) break
    if (/^(Request updated|Request status updated|New comment added|New request added)$/i.test(trimmed)) break
    if (/^(Marwan|Amr|.+) updated a request in the Admin Helpdesk Portal\.$/i.test(trimmed)) break
    if (/^Open request$/i.test(trimmed)) break
    kept.push(line)
  }

  const result = kept.join("\n").trim()

  // Reject if what's left is just system notification fields (no human text)
  const isSystemContent =
    /^(Request\s+.+\nRequest ID\s+|Module\s+|Update\s+)/m.test(result) &&
    result.split("\n").filter(l => l.trim()).length <= 6

  if (isSystemContent) return ""

  return result
}

function getCommentId(payload: InboundEmailPayload, requestId: string, content: string) {
  const stableSource = payload.messageId || `${requestId}:${normalizeAddress(payload.from)}:${content}`
  const hash = createHash("sha1").update(stableSource).digest("hex").slice(0, 16)
  return `CMT-EMAIL-${hash}`
}

export function addInboundEmailReplyAsComment(payload: InboundEmailPayload) {
  const requestId = extractRequestIdFromInboundEmail(payload)
  const content = extractReplyText(payload)
  const fromEmail = normalizeAddress(payload.from).toLowerCase()

  if (!requestId) {
    return { ok: false as const, reason: "Request ID not found in email" }
  }

  if (!content) {
    return { ok: false as const, reason: "Reply content is empty" }
  }

  const user = fromEmail ? findUserByEmail(fromEmail) : undefined
  const authorName = user?.name || fromEmail || "Email Reply"
  const authorId = user?.id || `EMAIL-${fromEmail || "unknown"}`
  const commentId = getCommentId(payload, requestId, content)
  const existingComment = commentsStore
    .getComments(requestId)
    .find((comment) => comment.id === commentId)

  if (existingComment) {
    return { ok: true as const, requestId, comment: existingComment, duplicate: true }
  }

  const comment = commentsStore.addComment(requestId, {
    id: commentId,
    content,
    authorId,
    author: {
      id: authorId,
      name: authorName,
      email: fromEmail || "unknown-email-reply",
      picture: user?.image || undefined,
    },
    createdAt: new Date().toISOString(),
  })

  return { ok: true as const, requestId, comment }
}
