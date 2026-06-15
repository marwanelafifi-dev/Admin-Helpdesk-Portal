import { NextResponse } from "next/server"
import { verifyApprovalToken } from "@/lib/approvalToken"
import { requestStore } from "@/lib/requestStore"
import { resolveRequestManagerEmail, resolveRequestManagerName, notifyDecision } from "@/lib/approvalNotify"
import { commentsStore } from "@/lib/commentsStore"

export const runtime = "nodejs"

const AWAITING_STATUSES = new Set(["awaiting_approval", "in_customs"])

/**
 * GET  — validates token + manager, then shows an HTML form for the rejection reason.
 * POST — receives the form, applies the rejection with the reason as a comment.
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
    return htmlResponse({ title: "Link expired or invalid", body: `<p>This rejection link can't be used. (${verified.reason})</p>` }, 400)
  }
  if (verified.rid !== id) {
    return htmlResponse({ title: "Link mismatch", body: `<p>This token doesn't match this request.</p>` }, 400)
  }

  const all = requestStore.getAll()
  const request = all.find((r) => r.id === id)
  if (!request) {
    return htmlResponse({ title: "Request not found", body: `<p>The request could not be found.</p>` }, 404)
  }

  // Strict manager check — no legacy bypass
  const currentManager = resolveRequestManagerEmail(request)
  if (!verified.managerEmail || !currentManager || currentManager !== verified.managerEmail) {
    return htmlResponse({
      title: "Not authorized",
      body: `<p>Only the request's Direct Manager can use this link.</p>`,
      accent: "red",
    }, 403)
  }

  if (!AWAITING_STATUSES.has(request.status)) {
    return htmlResponse({
      title: "Already processed",
      body: `<p>This request is no longer Awaiting Approval (current status: <strong>${escapeHtml(request.status)}</strong>). No change made.</p>`,
    }, 200)
  }

  // Show the reason form — POST back to the same route
  const postUrl = `/api/requests/${encodeURIComponent(id)}/reject`
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Reject Purchase Request</title>
<style>
  body{font:14px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f8fafc;color:#0f172a;margin:0;padding:48px 16px}
  .card{max-width:520px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:32px;box-shadow:0 4px 12px rgba(0,0,0,.04)}
  h1{font-size:18px;margin:0 0 6px;color:#ef4444}
  .subtitle{color:#64748b;font-size:13px;margin:0 0 20px}
  .req-box{background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 14px;margin-bottom:20px;font-size:13px;color:#991b1b}
  label{display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px}
  textarea{width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font:14px inherit;resize:vertical;min-height:100px;outline:none}
  textarea:focus{border-color:#ef4444;box-shadow:0 0 0 3px rgba(239,68,68,.1)}
  .hint{color:#9ca3af;font-size:12px;margin-top:4px}
  button{margin-top:16px;width:100%;padding:12px;background:#ef4444;color:#fff;font:600 14px inherit;border:none;border-radius:8px;cursor:pointer}
  button:hover{background:#dc2626}
</style></head>
<body><div class="card">
  <h1>Reject Purchase Request</h1>
  <p class="subtitle">Please provide a reason so the requester understands why this was rejected.</p>
  <div class="req-box"><strong>${escapeHtml(request.title)}</strong> &nbsp;·&nbsp; ${escapeHtml(request.id)}</div>
  <form method="POST" action="${escapeHtml(postUrl)}">
    <input type="hidden" name="token" value="${escapeHtml(token)}" />
    <label for="reason">Rejection Reason <span style="color:#ef4444">*</span></label>
    <textarea id="reason" name="reason" placeholder="Explain why this purchase request is being rejected..." required></textarea>
    <p class="hint">This will be added as a comment on the request and emailed to the requester.</p>
    <button type="submit">Confirm Rejection</button>
  </form>
</div></body></html>`

  return new NextResponse(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  let token = ""
  let reason = ""
  const contentType = req.headers.get("content-type") ?? ""
  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const formData = await req.formData()
    token = (formData.get("token") as string) ?? ""
    reason = ((formData.get("reason") as string) ?? "").trim()
  } else {
    const body = await req.json().catch(() => ({}))
    token = body.token ?? ""
    reason = (body.reason ?? "").trim()
  }

  const verified = verifyApprovalToken(token, "reject")
  if (!verified.ok) {
    return htmlResponse({ title: "Link expired or invalid", body: `<p>This rejection link can't be used. (${verified.reason})</p>` }, 400)
  }
  if (verified.rid !== id) {
    return htmlResponse({ title: "Link mismatch", body: `<p>This token doesn't match this request.</p>` }, 400)
  }
  if (!reason) {
    return htmlResponse({ title: "Reason required", body: `<p>Please go back and provide a rejection reason.</p>`, accent: "red" }, 400)
  }

  const all = requestStore.getAll()
  const request = all.find((r) => r.id === id)
  if (!request) {
    return htmlResponse({ title: "Request not found", body: `<p>The request could not be found.</p>` }, 404)
  }

  const currentManager = resolveRequestManagerEmail(request)
  if (!verified.managerEmail || !currentManager || currentManager !== verified.managerEmail) {
    return htmlResponse({
      title: "Not authorized",
      body: `<p>Only the request's Direct Manager can use this link.</p>`,
      accent: "red",
    }, 403)
  }

  if (!AWAITING_STATUSES.has(request.status)) {
    return htmlResponse({
      title: "Already processed",
      body: `<p>This request is no longer Awaiting Approval (current status: <strong>${escapeHtml(request.status)}</strong>). No change made.</p>`,
    }, 200)
  }

  const now = new Date().toISOString()
  const managerName = resolveRequestManagerName(request) ?? verified.managerEmail
  const commentContent = `Rejected\nReason: ${reason}`

  const updated = {
    ...request,
    status: "cancelled" as const,
    updatedAt: now,
    statusHistory: [
      ...(request.statusHistory ?? []),
      { status: "cancelled" as const, changedBy: verified.managerEmail, changedAt: now, comment: `Rejected by Direct Manager: ${reason}` },
    ],
  }
  requestStore.upsert(updated)

  commentsStore.addComment(request.id, {
    id: `CMT-REJECT-${Date.now()}`,
    content: commentContent,
    authorId: verified.managerEmail,
    author: { id: verified.managerEmail, name: managerName, email: verified.managerEmail },
    createdAt: now,
  })

  await notifyDecision({
    request: updated,
    action: "rejected",
    managerEmail: verified.managerEmail,
    managerName,
    reason,
  })

  return htmlResponse({
    title: "Request rejected",
    body: `<p><strong>${escapeHtml(request.title)}</strong> (${escapeHtml(request.id)}) has been <strong>cancelled</strong>.</p>
           <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 14px;font-size:13px;color:#991b1b;margin-top:12px;"><strong>Reason:</strong> ${escapeHtml(reason)}</div>
           <p style="color:#64748b;font-size:13px;margin-top:12px;">This reason has been added as a comment on the request and the team has been notified.</p>`,
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
  return new NextResponse(html, { status, headers: { "Content-Type": "text/html; charset=utf-8" } })
}
