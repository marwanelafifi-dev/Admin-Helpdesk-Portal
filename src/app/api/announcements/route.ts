import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  deleteAnnouncementRecord,
  DEFAULT_ANNOUNCEMENT_SIGNATURE,
  readAnnouncementStore,
  saveAnnouncementDraft,
  saveAnnouncementTemplate,
  saveSentAnnouncement,
  type AnnouncementAttachment,
} from "@/lib/announcementStore"
import { readUsers } from "@/lib/userStore"
import { sendAnnouncementEmail } from "@/lib/emailService"
import { canManageIntranetContent, type IntranetOwner } from "@/lib/functionRegistry"

export const runtime = "nodejs"

const VALID_OWNERS: IntranetOwner[] = ["company", "admin", "hr", "finance"]

type Payload = {
  mode?: "send" | "draft" | "template"
  owner?: IntranetOwner
  id?: string
  templateName?: string
  subject?: string
  body?: string
  signature?: string
  signatureLogo?: string
  to?: string[]
  cc?: string[]
  includeAllCompany?: boolean
  autoSendEnabled?: boolean
  scheduleFrequency?: "once" | "weekly" | "monthly"
  scheduleDayOfWeek?: number
  scheduledAt?: string
  attachments?: AnnouncementAttachment[]
}

function cleanEmails(values: unknown): string[] {
  if (!Array.isArray(values)) return []
  return Array.from(new Set(values
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim().toLowerCase())
    .filter((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))))
}

function dataUrlToEmailAttachment(att: AnnouncementAttachment) {
  const match = typeof att.url === "string" ? att.url.match(/^data:([^;,]+)?;base64,(.*)$/) : null
  if (!match) return null
  return {
    filename: att.name || "attachment",
    content: Buffer.from(match[2] || "", "base64"),
    contentType: att.mimeType || match[1] || "application/octet-stream",
  }
}

/**
 * The owner a non-Full-Access caller is allowed to act as, derived strictly
 * from their real role — never trust a client-supplied owner for anyone but
 * Full Access, or a Finance user could tamper with the request body to post
 * as "hr".
 */
function effectiveOwnerFor(session: any, requestedOwner: unknown, intranetOwners?: IntranetOwner[]): IntranetOwner {
  const role = session?.user?.role
  if (
    VALID_OWNERS.includes(requestedOwner as IntranetOwner)
    && canManageIntranetContent(requestedOwner as IntranetOwner, role, intranetOwners)
  ) {
    return requestedOwner as IntranetOwner
  }
  if (role === "Administration Team") return "admin"
  if (role === "People Team") return "hr"
  if (role === "Finance Team") return "finance"
  return "company"
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const ownerParam = new URL(req.url).searchParams.get("owner")
  if (!VALID_OWNERS.includes(ownerParam as IntranetOwner)) {
    return NextResponse.json({ error: "owner query param is required" }, { status: 400 })
  }
  const owner = ownerParam as IntranetOwner
  if (!canManageIntranetContent(owner, session.user.role, (session.user as any).intranetOwners)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const store = readAnnouncementStore()
  const data = {
    sent: store.sent.filter((item) => (item.owner ?? "company") === owner),
    drafts: store.drafts.filter((item) => (item.owner ?? "company") === owner),
    templates: store.templates.filter((item) => (item.owner ?? "company") === owner),
  }

  const users = readUsers()
    .filter((user) => user.active !== false && user.email)
    .map((user) => ({ id: user.id, name: user.name, email: user.email, role: user.role }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return NextResponse.json({ data, users })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await req.json()) as Payload
  const intranetOwners = (session.user as any).intranetOwners as IntranetOwner[] | undefined
  const owner = effectiveOwnerFor(session, body.owner, intranetOwners)
  if (!canManageIntranetContent(owner, session.user.role, intranetOwners)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const now = new Date().toISOString()
  const id = body.id || `ANN-${Date.now()}`
  const subject = (body.subject ?? "").trim()
  const messageBody = (body.body ?? "").trim()
  const signature = (body.signature ?? DEFAULT_ANNOUNCEMENT_SIGNATURE).trim() || DEFAULT_ANNOUNCEMENT_SIGNATURE
  const signatureLogo = typeof body.signatureLogo === "string" ? body.signatureLogo : undefined
  const attachments = Array.isArray(body.attachments) ? body.attachments : []

  if (body.mode === "template") {
    const name = (body.templateName ?? subject).trim()
    if (!name || !subject || !messageBody) {
      return NextResponse.json({ error: "Template name, subject, and body are required" }, { status: 400 })
    }
    if (body.autoSendEnabled && !body.scheduledAt) {
      return NextResponse.json({ error: "Auto-send templates require a date and time" }, { status: 400 })
    }
    const template = saveAnnouncementTemplate({
      id,
      owner,
      name,
      subject,
      body: messageBody,
      signature,
      signatureLogo,
      to: cleanEmails(body.to),
      cc: cleanEmails(body.cc),
      includeAllCompany: Boolean(body.includeAllCompany),
      autoSendEnabled: Boolean(body.autoSendEnabled),
      scheduleFrequency: body.scheduleFrequency === "weekly" || body.scheduleFrequency === "monthly"
        ? body.scheduleFrequency
        : "once",
      scheduleDayOfWeek: typeof body.scheduleDayOfWeek === "number" ? body.scheduleDayOfWeek : 1,
      scheduledAt: body.scheduledAt,
      createdBy: session.user.name ?? session.user.email ?? "Admin",
      createdAt: now,
      updatedAt: now,
    })
    return NextResponse.json({ template })
  }

  if (!subject || !messageBody) {
    return NextResponse.json({ error: "Subject and message body are required" }, { status: 400 })
  }

  const message = {
    id,
    owner,
    subject,
    body: messageBody,
    signature,
    signatureLogo,
    to: cleanEmails(body.to),
    cc: cleanEmails(body.cc),
    includeAllCompany: Boolean(body.includeAllCompany),
    attachments,
    createdBy: session.user.name ?? session.user.email ?? "Admin",
    createdByEmail: session.user.email ?? "",
    createdAt: now,
    updatedAt: now,
  }

  if (body.mode === "draft") {
    return NextResponse.json({ draft: saveAnnouncementDraft(message) })
  }

  const companyRecipients = message.includeAllCompany
    ? readUsers().filter((user) => user.active !== false).map((user) => user.email)
    : []
  const recipients = cleanEmails([...companyRecipients, ...message.to])

  if (recipients.length === 0) {
    return NextResponse.json({ error: "Add at least one recipient or select all company" }, { status: 400 })
  }

  try {
    await sendAnnouncementEmail({
      to: recipients,
      cc: message.cc,
      subject: message.subject,
      body: message.body,
      signature: message.signature,
      signatureLogo: message.signatureLogo,
      senderName: message.createdBy,
      functionId: owner === "company" ? "admin" : owner,
      attachments: attachments.map(dataUrlToEmailAttachment).filter(Boolean) as any[],
    })
  } catch (emailError) {
    const errorMessage = emailError instanceof Error ? emailError.message : "Failed to send announcement emails"
    console.error("Email sending failed:", errorMessage)
    return NextResponse.json({ error: `Failed to send emails: ${errorMessage}` }, { status: 500 })
  }

  const sent = saveSentAnnouncement({
    ...message,
    sentAt: now,
    recipientCount: recipients.length,
  })

  return NextResponse.json({ sent })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const type = url.searchParams.get("type")
  const id = url.searchParams.get("id")
  if ((type !== "drafts" && type !== "templates") || !id) {
    return NextResponse.json({ error: "Invalid delete request" }, { status: 400 })
  }

  const store = readAnnouncementStore()
  const record = store[type].find((item) => item.id === id)
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  if (!canManageIntranetContent(record.owner ?? "company", session.user.role, (session.user as any).intranetOwners)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return NextResponse.json({ success: deleteAnnouncementRecord(type, id) })
}
