import type { EngineRequest } from "@/services/engineService"
import { readCompanyData } from "@/lib/companyDataServerStore"
import { sendRequestUpdateEmail } from "@/lib/emailService"
import { companyFromEmail } from "@/lib/company"
import { functionForModule } from "@/lib/functionRegistry"

const ADMIN_HELPDESK_EMAIL = "adminhelpdesk@si-ware.com"
const FINANCE_AP_EMAIL = "ap@si-ware.com"
const HR_EMAIL = "human.resources@si-ware.com"

function functionMailbox(module: string) {
  const owner = functionForModule(module)
  if (owner === "finance") return FINANCE_AP_EMAIL
  if (owner === "hr") return HR_EMAIL
  return ADMIN_HELPDESK_EMAIL
}

/** Find the Direct Manager email for a Purchase / HR / Shipping request. */
export function resolveRequestManagerEmail(request: EngineRequest): string | undefined {
  const payload = (request.payload ?? {}) as Record<string, any>

  if (request.module === "finance_invoice_payment" && payload.poOrContract === "po") {
    const approverEmail = typeof payload.approverEmail === "string" ? payload.approverEmail.trim().toLowerCase() : ""
    return approverEmail || undefined
  }

  // Shipping uses approvers.directManager.{name,email}
  const shippingMgrEmail = payload?.approvers?.directManager?.email
  if (typeof shippingMgrEmail === "string" && shippingMgrEmail.trim()) {
    return shippingMgrEmail.trim().toLowerCase()
  }

  const storedManagerEmail = payload.directManagerEmail
  if (typeof storedManagerEmail === "string" && storedManagerEmail.trim()) {
    return storedManagerEmail.trim().toLowerCase()
  }

  // Travel uses authorizedManager; Purchase/HR use directManager
  const name = (
    typeof payload.authorizedManager === "string" ? payload.authorizedManager.trim() :
    typeof payload.directManager === "string" ? payload.directManager.trim() : ""
  )
  if (!name) return undefined
  // Check both managers and authorized_managers lists
  const cd = readCompanyData(companyFromEmail(request.requesterEmail))
  for (const m of [...(cd.authorized_managers ?? []), ...(cd.managers ?? [])]) {
    if (typeof m === "string") {
      if (m.toLowerCase() === name.toLowerCase() && m.includes("@")) return m.toLowerCase()
    } else if (m && typeof m === "object") {
      if ((m.name ?? "").toLowerCase() === name.toLowerCase()) {
        return ((m.email ?? "") as string).toLowerCase() || undefined
      }
    }
  }
  const user = readUsers().find((item) =>
    item.active &&
    (
      item.email.toLowerCase() === name.toLowerCase() ||
      item.name.trim().toLowerCase() === name.toLowerCase()
    )
  )
  if (user?.email) return user.email.trim().toLowerCase()

  if (name.includes("@")) return name.toLowerCase()
  return undefined
}

/** Find the Direct Manager display name for a request. */
export function resolveRequestManagerName(request: EngineRequest): string | undefined {
  const payload = (request.payload ?? {}) as Record<string, any>

  if (request.module === "finance_invoice_payment" && payload.poOrContract === "po") {
    return String(payload.approverName ?? payload.approverEmail ?? "").trim() || undefined
  }

  // Shipping — name stored directly
  const shippingMgrName = payload?.approvers?.directManager?.name
  if (typeof shippingMgrName === "string" && shippingMgrName.trim()) return shippingMgrName.trim()

  // Travel uses authorizedManager; Purchase/HR use directManager
  const name = (
    typeof payload.authorizedManager === "string" ? payload.authorizedManager.trim() :
    typeof payload.directManager === "string" ? payload.directManager.trim() : ""
  )
  if (name) return name
  return undefined
}

/** Fan out a decision notification according to the owning function's email policy. */
export async function notifyDecision(params: {
  request: EngineRequest
  action: "approved" | "rejected"
  managerEmail?: string
  managerName?: string
  reason?: string
}): Promise<void> {
  // Approval decisions use the function's shared operational mailbox. Team
  // members receive in-app notifications, preventing duplicate email fan-out.
  const recipients = new Set<string>()
  const add = (e?: string) => {
    const t = (e ?? "").trim().toLowerCase()
    if (t) recipients.add(t)
  }
  add(params.request.requesterEmail)
  add(functionMailbox(params.request.module))
  if (params.managerEmail) add(params.managerEmail)
  const payloadCc = (params.request.payload as any)?.ccEmails
  if (Array.isArray(payloadCc)) payloadCc.forEach((e) => add(e))
  const adminCc = (params.request as any)?.adminCc
  if (Array.isArray(adminCc)) adminCc.forEach((e) => add(e))

  const list = Array.from(recipients)
  if (list.length === 0) return

  const verbPast = params.action === "approved" ? "approved" : "rejected"
  const actorName = params.managerName ?? (params.managerEmail ? `Manager (${params.managerEmail})` : "Manager")
  const preview = params.reason
    ? `The Direct Manager has ${verbPast} this purchase request. Reason: ${params.reason}`
    : `The Direct Manager has ${verbPast} this purchase request.`

  try {
    await sendRequestUpdateEmail({
      to: list,
      updateType: "status",
      requestId: params.request.id,
      requestTitle: params.request.title,
      module: params.request.module,
      actorName,
      preview,
      previousStatus: "awaiting_approval",
      newStatus: params.action === "approved" ? "in_progress" : "cancelled",
    })
  } catch (err) {
    console.error("[approvalNotify] Failed to fan-out decision email", err)
  }
}
