import { NextResponse } from "next/server"
import { verifyApprovalToken } from "@/lib/approvalToken"
import { requestStore } from "@/lib/requestStore"
import { resolveRequestManagerEmail, resolveRequestManagerName, notifyDecision } from "@/lib/approvalNotify"
import { commentsStore } from "@/lib/commentsStore"
import { AUTO_CC_EMAIL } from "@/services/engineService"
import { autoCreateHrLetterFromTravel } from "@/lib/hrLetterAutoCreate"
import { auth } from "@/auth"
import { requiresManagerApproval } from "@/lib/functionRegistry"
import { logApprovalAttempt } from "@/lib/approvalSecurity"
import { hasRecordedApproval } from "@/lib/approvalRules"
import { publicBaseUrl } from "@/lib/publicBaseUrl"

export const runtime = "nodejs"

const AWAITING_STATUSES = ["awaiting_approval"] as const

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const url = new URL(req.url)
  const token = url.searchParams.get("token") ?? ""

  const verified = verifyApprovalToken(token, "approve")
  if (!verified.ok) {
    logApprovalAttempt({ req, requestId: id, action: "approve", outcome: "denied", details: `Invalid approval token (${verified.reason})` })
    return htmlResponse({
      title: "Link expired or invalid",
      body: `<p>This approval link can't be used. (${verified.reason})</p><p>Open the request directly in the portal to take action.</p>`,
    }, 400)
  }
  if (verified.rid !== id) {
    logApprovalAttempt({ req, requestId: id, action: "approve", actorEmail: verified.managerEmail, outcome: "denied", details: "Token request ID mismatch" })
    return htmlResponse({ title: "Link mismatch", body: `<p>This token doesn't match this request.</p>` }, 400)
  }

  const all = requestStore.getAll()
  const request = all.find((r) => r.id === id)
  if (!request) {
    logApprovalAttempt({ req, requestId: id, action: "approve", actorEmail: verified.managerEmail, outcome: "denied", details: "Request not found" })
    return htmlResponse({ title: "Request not found", body: `<p>The request could not be found.</p>` }, 404)
  }

  if (!requiresManagerApproval(request)) {
    logApprovalAttempt({ req, requestId: id, requestTitle: request.title, action: "approve", actorEmail: verified.managerEmail, outcome: "denied", details: "Request is not eligible for manager approval" })
    return htmlResponse({ title: "Approval not required", body: `<p>This request does not require manager approval. No change made.</p>`, accent: "red" }, 403)
  }
  if (hasRecordedApproval(request)) {
    logApprovalAttempt({ req, requestId: id, requestTitle: request.title, action: "approve", actorEmail: verified.managerEmail, outcome: "denied", details: "A prior manager approval is already recorded" })
    return htmlResponse({ title: "Already processed", body: `<p>A manager approval is already recorded for this request. No change made.</p>` }, 200)
  }

  // Strict manager check — token must carry managerEmail and it must match
  // the request's current Direct Manager. No legacy fallback bypass.
  const currentManager = resolveRequestManagerEmail(request)
  const approverLabel = request.module === "finance_invoice_payment" && (request.payload as any)?.poOrContract === "po" ? "selected approver" : "Direct Manager"
  if (!verified.managerEmail || !currentManager || currentManager !== verified.managerEmail) {
    logApprovalAttempt({ req, requestId: id, requestTitle: request.title, action: "approve", actorEmail: verified.managerEmail, outcome: "denied", details: "Token manager does not match the request manager" })
    return htmlResponse({
      title: "Not authorized",
      body: `<p>Only the request's ${approverLabel} can use this link.</p>`,
      accent: "red",
    }, 403)
  }

  // Clear any open session before an email action so the assigned manager
  // explicitly signs in from scratch.
  if (url.searchParams.get("fresh") !== "1") {
    const returnTo = `${url.pathname}?token=${encodeURIComponent(token)}&fresh=1`
    return NextResponse.redirect(new URL(`/login?approval=1&callbackUrl=${encodeURIComponent(returnTo)}`, publicBaseUrl(req)), 303)
  }

  const session = await auth()
  const signedInEmail = session?.user?.email?.trim().toLowerCase()
  if (!signedInEmail) {
    logApprovalAttempt({ req, requestId: id, requestTitle: request.title, action: "approve", actorEmail: verified.managerEmail, outcome: "denied", details: "Manager sign-in required" })
    return NextResponse.redirect(new URL("/login", req.url), 303)
  }
  if (signedInEmail !== verified.managerEmail) {
    logApprovalAttempt({ req, requestId: id, requestTitle: request.title, action: "approve", actorEmail: signedInEmail, outcome: "denied", details: `Signed-in user does not match assigned manager ${verified.managerEmail}` })
    return htmlResponse({ title: "Not authorized", body: `<p>Sign in as the assigned ${approverLabel} to approve this request.</p>`, accent: "red" }, 403)
  }

  if (!AWAITING_STATUSES.includes(request.status)) {
    logApprovalAttempt({ req, requestId: id, requestTitle: request.title, action: "approve", actorEmail: signedInEmail, outcome: "denied", details: `Request already processed (current status: ${request.status})` })
    return htmlResponse({
      title: "Already processed",
      body: `<p>This request is no longer Awaiting Approval (current status: <strong>${escapeHtml(request.status)}</strong>). No change made.</p>`,
    }, 200)
  }

  const now = new Date().toISOString()
  const managerName = resolveRequestManagerName(request) ?? verified.managerEmail

  // When a Travel request is approved (→ in_progress), ensure ap@si-ware.com is on CC.
  const updated = requestStore.transitionIfStatus(id, AWAITING_STATUSES, (current) => {
    const existingAdminCc: string[] = Array.isArray(current.adminCc) ? current.adminCc : []
    const adminCc = current.module === "travel" && !existingAdminCc.map(e => e.toLowerCase()).includes(AUTO_CC_EMAIL.toLowerCase())
      ? [...existingAdminCc, AUTO_CC_EMAIL]
      : existingAdminCc
    return {
      ...current,
      status: "in_progress" as const,
      updatedAt: now,
      adminCc,
      statusHistory: [...(current.statusHistory ?? []), { status: "in_progress" as const, changedBy: verified.managerEmail, changedAt: now, comment: approverLabel === "selected approver" ? "Approved by Selected Approver" : "Approved by Direct Manager" }],
    }
  })
  if (!updated) {
    logApprovalAttempt({ req, requestId: id, requestTitle: request.title, action: "approve", actorEmail: signedInEmail, outcome: "denied", details: "Concurrent decision already recorded" })
    return htmlResponse({ title: "Already processed", body: `<p>This request was already decided. No change made.</p>` }, 200)
  }
  logApprovalAttempt({ req, requestId: id, requestTitle: request.title, action: "approve", actorEmail: signedInEmail, outcome: "success", details: "Approved by assigned manager" })

  try {
    autoCreateHrLetterFromTravel(updated)
  } catch (err) {
    console.error("Failed to create HR Letter:", err)
  }

  commentsStore.addComment(request.id, {
    id: `CMT-APPROVE-${Date.now()}`,
    content: "Approved",
    authorId: verified.managerEmail,
    author: { id: verified.managerEmail, name: managerName, email: verified.managerEmail },
    createdAt: now,
  })

  await notifyDecision({
    request: updated,
    action: "approved",
    managerEmail: verified.managerEmail,
    managerName,
  })

  return htmlResponse({
    title: "Request approved",
    body: `<p>Thank you. <strong>${escapeHtml(request.title)}</strong> (${escapeHtml(request.id)}) is now <strong>In Progress</strong>.</p>
           <p style="color:#64748b;font-size:13px;margin-top:8px;">A comment "Approved" has been added to the request thread. The team has been notified.</p>`,
    accent: "emerald",
  })
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

function htmlResponse(opts: { title: string; body: string; accent?: "emerald" | "red" }, status = 200) {
  const accentColor = opts.accent === "emerald" ? "#10b981" : opts.accent === "red" ? "#ef4444" : "#2563eb"
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(opts.title)}</title>
<style>
  body{font:14px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f8fafc;color:#0f172a;margin:0;padding:48px 16px}
  .card{max-width:520px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:32px;box-shadow:0 4px 12px rgba(0,0,0,.04)}
  h1{font-size:18px;margin:0 0 12px;color:${accentColor}}
  p{margin:0 0 12px;line-height:1.55}
  strong{color:#0f172a}
</style></head>
<body><div class="card"><h1>${escapeHtml(opts.title)}</h1>${opts.body}</div></body></html>`
  return new NextResponse(html, { status, headers: { "Content-Type": "text/html; charset=utf-8" } })
}
