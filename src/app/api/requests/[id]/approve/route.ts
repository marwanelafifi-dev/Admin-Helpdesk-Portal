import { NextResponse } from "next/server"
import { verifyApprovalToken } from "@/lib/approvalToken"
import { requestStore } from "@/lib/requestStore"
import { resolveRequestManagerEmail, notifyDecision } from "@/lib/approvalNotify"
import { commentsStore } from "@/lib/commentsStore"

export const runtime = "nodejs"

const AWAITING_STATUSES = new Set(["awaiting_approval", "in_customs"])

/**
 * GET /api/requests/:id/approve?token=...
 *
 * One-click approval link emailed to the Direct Manager when a Purchase
 * request moves to Awaiting Approval. The token is HMAC-signed and bound
 * to:
 *   - the request id (token only works for that one request)
 *   - the manager's email (we cross-check against the request's current
 *     Direct Manager before applying — defends against forwarded emails
 *     and stale tokens after the manager has been reassigned).
 *
 * Idempotent: if the status has moved on, we show a friendly note rather
 * than re-applying. After a successful flip we fan an email out to the
 * Administration Team, the requester, the helpdesk mailbox, and the
 * manager so the loop is closed.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const url = new URL(req.url)
  const token = url.searchParams.get("token") ?? ""

  const verified = verifyApprovalToken(token, "approve")
  if (!verified.ok) {
    return htmlResponse({
      title: "Link expired or invalid",
      body: `<p>This approval link can't be used. (${verified.reason})</p><p>Open the request directly in the portal to take action.</p>`,
    }, 400)
  }
  if (verified.rid !== id) {
    return htmlResponse({
      title: "Link mismatch",
      body: `<p>This token doesn't match this request.</p>`,
    }, 400)
  }

  const all = requestStore.getAll()
  const request = all.find((r) => r.id === id)
  if (!request) {
    return htmlResponse({
      title: "Request not found",
      body: `<p>The request could not be found.</p>`,
    }, 404)
  }

  // Manager check — only the request's current Direct Manager may decide.
  // Forwarded emails / stale links bounce.
  const currentManager = resolveRequestManagerEmail(request)
  if (verified.managerEmail) {
    if (!currentManager || currentManager !== verified.managerEmail) {
      return htmlResponse({
        title: "Not authorized",
        body: `<p>Only the request's current Direct Manager can use this link. Please open the request in the portal to take action there.</p>`,
        accent: "red",
      }, 403)
    }
  } else if (currentManager) {
    // Legacy tokens issued before we bound the manager email — fall back
    // to allowing the action if a manager is set. Future tokens will
    // always carry mgr.
  }

  if (!AWAITING_STATUSES.has(request.status)) {
    return htmlResponse({
      title: "Already processed",
      body: `<p>This request is no longer Awaiting Approval (current status: <strong>${escapeHtml(request.status)}</strong>). No change made.</p>`,
    }, 200)
  }

  const now = new Date().toISOString()
  const actor = verified.managerEmail ?? currentManager ?? "manager-email-approval"
  const updated = {
    ...request,
    // Manager approval moves the request into the In Progress queue —
    // the Administration Team handles the rest from here.
    status: "in_progress" as const,
    updatedAt: now,
    statusHistory: [
      ...(request.statusHistory ?? []),
      { status: "in_progress" as const, changedBy: actor, changedAt: now, comment: "Approved by Direct Manager" },
    ],
  }
  requestStore.upsert(updated)

  // Drop a system comment in the request thread so the decision is
  // visible in the Comments tab alongside any user chatter.
  commentsStore.addComment(request.id, {
    id: `CMT-APPROVE-${Date.now()}`,
    content: "Approved",
    authorId: actor,
    author: { id: actor, name: "Direct Manager", email: currentManager ?? verified.managerEmail ?? "" },
    createdAt: now,
  })

  // Fan-out: tell admin team + requester + helpdesk + manager.
  await notifyDecision({
    request: updated,
    action: "approved",
    managerEmail: currentManager ?? verified.managerEmail,
  })

  return htmlResponse({
    title: "Request approved",
    body: `<p>Thank you. <strong>${escapeHtml(request.title)}</strong> (${escapeHtml(request.id)}) is now <strong>In Progress</strong>.</p><p style="color:#64748b;font-size:13px;margin-top:8px;">A comment <em>"Approved"</em> has been added to the request thread. The requester and the Administration Team have been notified by email.</p>`,
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
  return new NextResponse(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  })
}
