import type { EngineRequest } from "@/services/engineService"
import { readCompanyData } from "@/lib/companyDataServerStore"
import { readUsers } from "@/lib/userStore"
import { sendRequestUpdateEmail } from "@/lib/emailService"

const ADMIN_HELPDESK_EMAIL = "adminhelpdesk@si-ware.com"

/** Find the Direct Manager email for a Purchase / HR / Shipping request. */
export function resolveRequestManagerEmail(request: EngineRequest): string | undefined {
  const payload = (request.payload ?? {}) as Record<string, any>

  // Shipping uses approvers.directManager.{name,email}
  const shippingMgrEmail = payload?.approvers?.directManager?.email
  if (typeof shippingMgrEmail === "string" && shippingMgrEmail.trim()) {
    return shippingMgrEmail.trim().toLowerCase()
  }

  const storedManagerEmail = payload.directManagerEmail
  if (typeof storedManagerEmail === "string" && storedManagerEmail.trim()) {
    return storedManagerEmail.trim().toLowerCase()
  }

  // Purchase / HR store the manager's NAME under payload.directManager
  const name = typeof payload.directManager === "string" ? payload.directManager.trim() : ""
  if (!name) return undefined
  const cd = readCompanyData()
  for (const m of cd.managers ?? []) {
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

  // Shipping — name stored directly
  const shippingMgrName = payload?.approvers?.directManager?.name
  if (typeof shippingMgrName === "string" && shippingMgrName.trim()) return shippingMgrName.trim()

  // Purchase / HR — payload.directManager is the name string
  const name = typeof payload.directManager === "string" ? payload.directManager.trim() : ""
  if (name) return name
  return undefined
}

/** Fan out a decision notification to the team, requester, helpdesk, and manager. */
export async function notifyDecision(params: {
  request: EngineRequest
  action: "approved" | "rejected"
  managerEmail?: string
  managerName?: string
  reason?: string
}): Promise<void> {
  const adminEmails = readUsers()
    .filter((u) => u.active && u.role === "Administration Team")
    .map((u) => u.email)
    .filter(Boolean)

  const recipients = new Set<string>()
  const add = (e?: string) => {
    const t = (e ?? "").trim().toLowerCase()
    if (t) recipients.add(t)
  }
  adminEmails.forEach(add)
  add(params.request.requesterEmail)
  add(ADMIN_HELPDESK_EMAIL)
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
