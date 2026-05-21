import { NextResponse } from "next/server"
import { verifyApprovalToken } from "@/lib/approvalToken"
import { requestStore } from "@/lib/requestStore"
import { resolveRequestManagerEmail, notifyDecision } from "@/lib/approvalNotify"
import { commentsStore } from "@/lib/commentsStore"

export const runtime = "nodejs"

const AWAITING_STATUSES = new Set(["awaiting_approval", "in_customs"])

/**
 * GET /api/requests/:id/reject?token=...
 *
 * Counterpart to /approve — fires when the Direct Manager clicks Reject
 * in the approval email. Same security model: HMAC token bound to the
 * request id + the manager's email, cross-checked against the request's
 * current Direct Manager before any state change. Fans out a decision
 * notification to the team after the flip.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const url = new URL(req.url)
  const token = url.searchParams.get("token") ?? ""

  const verified = verifyApprovalToken(token, "reject")
  if (!verified.ok) {
    return htmlResponse({
      title: "Link expired or invalid",
      body: `<p>This rejection link can't be used. (${verified.reason})</p>`,
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

  const currentManager = resolveRequestManagerEmail(request)
  if (verified.managerEmail) {
    if (!currentManager || currentManager !== verified.managerEmail) {
      return htmlResponse({
        title: "Not authorized",
        body: `<p>Only the request's current Direct Manager can use this link. Please open the request in the portal to take action there.</p>`,
        accent: "red",
      }, 403)
    }
  }

  if (!AWAITING_STATUSES.has(request.status)) {
    return htmlResponse({
      title: "Already processed",
      body: `<p>This request is no longer Awaiting Approval (current status: <strong>${escapeHtml(request.status)}</strong>). No change made.</p>`,
    }, 200)
  }

  const now = new Date().toISOString()
  const actor = verified.managerEmail ?? currentManager ?? "manager-email-rejection"
  const updated = {
    ...request,
    status: "cancelled" as const,
    updatedAt: now,
    statusHistory: [
      ...(request.statusHistory ?? []),
      { status: "cancelled" as const, changedBy: actor, changedAt: now, comment: "Rejected by Direct Manager" },
    ],
  }
  requestStore.upsert(updated)

  commentsStore.addComment(request.id, {
    id: `CMT-REJECT-${Date.now()}`,
    content: "Rejected",
    authorId: actor,
    author: { id: actor, name: "Direct Manager", email: currentManager ?? verified.managerEmail ?? "" },
    createdAt: now,
  })

  await notifyDecision({
    request: updated,
    action: "rejected",
    managerEmail: currentManager ?? verified.managerEmail,
  })

  return htmlResponse({
    title: "Request rejected",
    body: `<p>The request <strong>${escapeHtml(request.title)}</strong> (${escapeHtml(request.id)}) has been <strong>cancelled</strong>.</p><p style="color:#64748b;font-size:13px;margin-top:8px;">A comment <em>"Rejected"</em> has been added to the request thread. The requester and the Administration Team have been notified by email.</p>`,
    accent: "red",
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
