import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { requestStore } from "@/lib/requestStore"
import { signApprovalToken } from "@/lib/approvalToken"
import { sendPurchaseApprovalEmail, sendShippingApprovalEmail, sendTravelApprovalEmail, sendReimbursementApprovalEmail, sendTravelReimbursementApprovalEmail, sendInvoicePaymentApprovalEmail } from "@/lib/emailService"
import { resolveRequestManagerEmail, resolveRequestManagerName } from "@/lib/approvalNotify"
import { functionForModule, MANAGER_APPROVAL_MODULES } from "@/lib/functionRegistry"
import { logServerAudit } from "@/lib/serverAuditLog"

export const runtime = "nodejs"

const ADMIN_HELPDESK_EMAIL = "adminhelpdesk@si-ware.com"
const FINANCE_AP_EMAIL = "ap@si-ware.com"
const HR_EMAIL = "hr@si-ware.com"

function functionMailbox(module: string) {
  const owner = functionForModule(module)
  if (owner === "finance") return FINANCE_AP_EMAIL
  if (owner === "hr") return HR_EMAIL
  return ADMIN_HELPDESK_EMAIL
}

/**
 * POST /api/requests/:id/send-approval-email
 *
 * Sends the Approval email to the request's Direct Manager with signed
 * Approve/Reject buttons. Called when a Purchase, Shipping, Travel, or
 * Reimbursement request transitions to "Awaiting Approval" status.
 *
 * Server-side so we can:
 *   - resolve the manager's email via the shared company-data.json
 *   - sign the one-shot HMAC tokens using AUTH_SECRET (never exposed
 *     to the browser)
 *   - send the email via the pooled SMTP transporter
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({})) as { resend?: boolean }
  const request = requestStore.getAll().find((r) => r.id === id)
  if (!request) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 })
  }
  if (!(MANAGER_APPROVAL_MODULES as readonly string[]).includes(request.module)) {
    return NextResponse.json({ error: "Only Purchase, Shipping, Travel, and Reimbursement requests use this flow" }, { status: 400 })
  }

  const payload = (request.payload ?? {}) as Record<string, any>
  const managerName = resolveRequestManagerName(request) ?? ""
  if (!managerName) {
    return NextResponse.json({ error: "No Direct Manager set on the request" }, { status: 400 })
  }

  // Resolve manager email from the shared company-data.json. Accepts
  // both legacy string entries and the newer { name, email } shape.
  const managerEmail = resolveRequestManagerEmail(request) ?? ""

  if (!managerEmail) {
    return NextResponse.json(
      { error: `No email on file for manager "${managerName}". Add one in Admin → Company Data → Managers.` },
      { status: 400 }
    )
  }

  // Cc: requester + the owning function's mailbox + request CCs. Function
  // team members do not receive the pending approval request.
  // Manager is the primary recipient.
  const toLower = managerEmail.toLowerCase()
  const ccSet = new Set<string>()
  const addCc = (e?: string) => {
    const t = (e ?? "").trim().toLowerCase()
    if (t && t !== toLower) ccSet.add(t)
  }
  addCc(request.requesterEmail)
  addCc(functionMailbox(request.module))
  // Also include any CC the requester typed on the form / admin CC list.
  for (const e of (payload.ccEmails ?? []) as string[]) addCc(e)
  for (const e of request.adminCc ?? []) addCc(e)

  const baseUrl = (
    process.env.NEXTAUTH_URL ??
    process.env.AUTH_URL ??
    new URL(req.url).origin
  ).replace(/\/$/, "")
  // Bind the tokens to the manager's email so only the intended recipient
  // can use them. The verify route compares this against the request's
  // current Direct Manager before applying the decision.
  const approveToken = signApprovalToken(id, "approve", managerEmail)
  const rejectToken = signApprovalToken(id, "reject", managerEmail)
  const approveUrl = `${baseUrl}/api/requests/${encodeURIComponent(id)}/approve?token=${approveToken}`
  const rejectUrl  = `${baseUrl}/api/requests/${encodeURIComponent(id)}/reject?token=${rejectToken}`

  try {
    if (request.module === "purchase") {
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
        costCenter: payload.costCenter,
        businessJustification: payload.businessJustification,
        notes: payload.notes,
        requesterName: request.requesterName,
        requesterEmail: request.requesterEmail,
        approveUrl,
        rejectUrl,
      })
    } else if (request.module === "shipping") {
      await sendShippingApprovalEmail({
        to: managerEmail,
        cc: Array.from(ccSet),
        managerName,
        requestId: request.id,
        requestTitle: request.title,
        direction: payload.direction,
        carrier: payload.carrier || payload.carrierName,
        trackingNumber: payload.trackingNumber,
        poNumber: payload.poNumber,
        costCenter: payload.costCenter,
        expectedDeliveryDate: payload.expectedDeliveryDate,
        description: payload.description,
        notes: payload.notes,
        requesterName: request.requesterName,
        requesterEmail: request.requesterEmail,
        approveUrl,
        rejectUrl,
      })
    } else if (request.module === "travel") {
      await sendTravelApprovalEmail({
        to: managerEmail,
        cc: Array.from(ccSet),
        managerName,
        requestId: request.id,
        requestTitle: request.title,
        travelType: payload.travelType,
        authorizedManager: payload.authorizedManager,
        costCenter: payload.costCenter,
        division: payload.division,
        destination: payload.destination,
        dateFrom: payload.dateFrom,
        dateTo: payload.dateTo,
        purposeOfTrip: payload.purposeOfTrip,
        tripServices: payload.tripServices,
        hotelNameOrLink: payload.hotelNameOrLink,
        flightNameOrLink: payload.flightNameOrLink,
        tripAllowance: payload.tripAllowance,
        airTicket: payload.airTicket,
        hotel: payload.hotel,
        transportationCarRental: payload.transportationCarRental,
        others: payload.others,
        othersAmount: payload.othersAmount,
        currency: payload.currency,
        estimatedTotalCosts: payload.estimatedTotalCosts,
        paymentMethod: payload.paymentMethod,
        paymentAmount: payload.paymentAmount,
        cashAmount: payload.cashAmount,
        creditCardAmount: payload.creditCardAmount,
        paymentCurrency: payload.paymentCurrency,
        notes: payload.notes,
        requesterName: request.requesterName,
        requesterEmail: request.requesterEmail,
        approveUrl,
        rejectUrl,
      })
    } else if (request.module === "finance_reimbursement") {
      await sendReimbursementApprovalEmail({
        to: managerEmail,
        cc: Array.from(ccSet),
        managerName,
        requestId: request.id,
        requestTitle: request.title,
        amount: typeof payload.amount === "number" ? payload.amount : undefined,
        currency: payload.currency,
        totalsByCurrency: payload.totalsByCurrency,
        costCenter: payload.costCenter,
        requesterName: request.requesterName,
        requesterEmail: request.requesterEmail,
        approveUrl,
        rejectUrl,
      })
    } else if (request.module === "finance_travel_reimbursement") {
      await sendTravelReimbursementApprovalEmail({
        to: managerEmail,
        cc: Array.from(ccSet),
        managerName,
        requestId: request.id,
        requestTitle: request.title,
        amount: typeof payload.amount === "number" ? payload.amount : undefined,
        currency: payload.currency,
        totalsByCurrency: payload.totalsByCurrency,
        costCenter: payload.costCenter,
        requesterName: request.requesterName,
        requesterEmail: request.requesterEmail,
        approveUrl,
        rejectUrl,
      })
    } else if (request.module === "finance_invoice_payment") {
      await sendInvoicePaymentApprovalEmail({
        to: managerEmail,
        cc: Array.from(ccSet),
        managerName,
        requestId: request.id,
        requestTitle: request.title,
        supplier: payload.supplier,
        poNumbers: Array.isArray(payload.poNumbers) ? payload.poNumbers : undefined,
        amount: typeof payload.amount === "number" ? payload.amount : undefined,
        currency: payload.currency,
        paymentTerms: payload.paymentTerms,
        paymentMethod: payload.paymentMethod,
        requesterName: request.requesterName,
        requesterEmail: request.requesterEmail,
        approveUrl,
        rejectUrl,
      })
    }
    if (body.resend === true) {
      logServerAudit({
        actor: session.user.name ?? session.user.email ?? "System",
        actorEmail: session.user.email ?? "",
        action: "approval_email_resent",
        targetId: request.id,
        targetTitle: request.title,
        details: `Approval email resent to ${managerEmail}; CC: ${Array.from(ccSet).join(", ") || "None"}`,
        category: "email",
        outcome: "success",
      })
    }
    return NextResponse.json({ ok: true, to: managerEmail, cc: Array.from(ccSet) })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("[approval-email] Failed to send", { id, error: msg })
    return NextResponse.json({ error: `Failed to send approval email: ${msg}` }, { status: 500 })
  }
}
