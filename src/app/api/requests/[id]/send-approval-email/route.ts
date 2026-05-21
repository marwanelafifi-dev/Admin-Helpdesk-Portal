import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { requestStore } from "@/lib/requestStore"
import { signApprovalToken } from "@/lib/approvalToken"
import { sendPurchaseApprovalEmail } from "@/lib/emailService"
import { readUsers } from "@/lib/userStore"
import { readCompanyData } from "@/lib/companyDataServerStore"

export const runtime = "nodejs"

const ADMIN_HELPDESK_EMAIL = "adminhelpdesk@si-ware.com"

/**
 * POST /api/requests/:id/send-approval-email
 *
 * Sends the Purchase Approval email to the request's Direct Manager
 * with signed Approve/Reject buttons. Called by the client when a
 * Purchase request transitions to "Awaiting Approval" (status code
 * `in_customs`).
 *
 * Server-side so we can:
 *   - resolve the manager's email via the shared company-data.json
 *   - sign the one-shot HMAC tokens using AUTH_SECRET (never exposed
 *     to the browser)
 *   - send the email via the pooled SMTP transporter
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const request = requestStore.getAll().find((r) => r.id === id)
  if (!request) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 })
  }
  if (request.module !== "purchase") {
    return NextResponse.json({ error: "Only Purchase requests use this flow" }, { status: 400 })
  }

  const payload = (request.payload ?? {}) as Record<string, any>
  const managerName = typeof payload.directManager === "string" ? payload.directManager.trim() : ""
  if (!managerName) {
    return NextResponse.json({ error: "No Direct Manager set on the request" }, { status: 400 })
  }

  // Resolve manager email from the shared company-data.json. Accepts
  // both legacy string entries and the newer { name, email } shape.
  const cd = readCompanyData()
  let managerEmail = ""
  for (const m of cd.managers ?? []) {
    if (typeof m === "string") {
      if (m.toLowerCase() === managerName.toLowerCase() && m.includes("@")) {
        managerEmail = m
      }
    } else if (m && typeof m === "object") {
      if ((m.name ?? "").toLowerCase() === managerName.toLowerCase()) {
        managerEmail = m.email ?? ""
      }
    }
  }
  // Fallback: if the manager string itself looks like an email, use it.
  if (!managerEmail && managerName.includes("@")) managerEmail = managerName

  if (!managerEmail) {
    return NextResponse.json(
      { error: `No email on file for manager "${managerName}". Add one in Admin → Company Data → Managers.` },
      { status: 400 }
    )
  }

  // Cc: requester + Administration Team + helpdesk (so everyone in the
  // loop sees the decision request). Manager is the primary recipient.
  const adminEmails = readUsers()
    .filter((u) => u.active && u.role === "Administration Team")
    .map((u) => u.email)
    .filter(Boolean)

  const toLower = managerEmail.toLowerCase()
  const ccSet = new Set<string>()
  const addCc = (e?: string) => {
    const t = (e ?? "").trim().toLowerCase()
    if (t && t !== toLower) ccSet.add(t)
  }
  adminEmails.forEach(addCc)
  addCc(request.requesterEmail)
  addCc(ADMIN_HELPDESK_EMAIL)
  // Also include any CC the requester typed on the form / admin CC list.
  for (const e of (payload.ccEmails ?? []) as string[]) addCc(e)
  for (const e of request.adminCc ?? []) addCc(e)

  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? ""
  // Bind the tokens to the manager's email so only the intended recipient
  // can use them. The verify route compares this against the request's
  // current Direct Manager before applying the decision.
  const approveToken = signApprovalToken(id, "approve", managerEmail)
  const rejectToken = signApprovalToken(id, "reject", managerEmail)
  const approveUrl = `${baseUrl}/api/requests/${encodeURIComponent(id)}/approve?token=${approveToken}`
  const rejectUrl  = `${baseUrl}/api/requests/${encodeURIComponent(id)}/reject?token=${rejectToken}`

  try {
    await sendPurchaseApprovalEmail({
      to: managerEmail,
      cc: Array.from(ccSet),
      managerName,
      requestId: request.id,
      requestTitle: request.title,
      itemTitle: payload.itemTitle,
      description: payload.description,
      category: payload.category,
      platform: payload.platform,
      supplier: payload.supplier,
      productUrl: payload.productUrl,
      quantity: typeof payload.quantity === "number" ? payload.quantity : undefined,
      estimatedPrice: typeof payload.estimatedPrice === "number" ? payload.estimatedPrice : undefined,
      department: payload.department,
      businessJustification: payload.businessJustification,
      notes: payload.notes,
      requesterName: request.requesterName,
      requesterEmail: request.requesterEmail,
      approveUrl,
      rejectUrl,
    })
    return NextResponse.json({ ok: true, to: managerEmail, cc: Array.from(ccSet) })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("[approval-email] Failed to send", { id, error: msg })
    return NextResponse.json({ error: `Failed to send approval email: ${msg}` }, { status: 500 })
  }
}
