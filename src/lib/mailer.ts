import nodemailer from "nodemailer"
import type { EngineRequest } from "./requests-api"

// Returns null when SMTP is not configured — callers should handle gracefully
function getTransport() {
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!user || !pass) return null

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: { user, pass },
    tls: { rejectUnauthorized: false }, // corporate proxy safe
  })
}

// ─── Email Templates ──────────────────────────────────────────────────────────

function newRequestHtml(req: EngineRequest): string {
  const moduleLabel = req.module.charAt(0).toUpperCase() + req.module.slice(1)
  const url = `${process.env.NEXTAUTH_URL ?? "http://localhost:3003"}/admin/all-requests`

  return `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#1e293b;padding:24px 32px;">
      <h1 style="color:#fff;margin:0;font-size:18px;">New ${moduleLabel} Request</h1>
      <p style="color:#94a3b8;margin:4px 0 0;font-size:13px;">Admin Request Platform</p>
    </div>
    <div style="padding:32px;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:8px 0;color:#64748b;width:140px;">Request ID</td><td style="padding:8px 0;font-weight:600;color:#1e293b;">${req.id}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Module</td><td style="padding:8px 0;font-weight:600;color:#1e293b;">${moduleLabel}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Title</td><td style="padding:8px 0;font-weight:600;color:#1e293b;">${req.title}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Submitted by</td><td style="padding:8px 0;font-weight:600;color:#1e293b;">${req.requesterName} (${req.requesterEmail})</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Date</td><td style="padding:8px 0;color:#1e293b;">${new Date(req.createdAt).toLocaleString("en-GB")}</td></tr>
      </table>
      <div style="margin-top:24px;">
        <a href="${url}" style="display:inline-block;background:#1d4ed8;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">View All Requests</a>
      </div>
    </div>
    <div style="background:#f8fafc;padding:16px 32px;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;">
      This is an automated notification from the Admin Request Platform.
    </div>
  </div>
</body>
</html>`
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function sendNewRequestNotification(req: EngineRequest, adminEmails: string[]) {
  if (adminEmails.length === 0) return

  const transport = getTransport()
  if (!transport) {
    console.warn("[mailer] SMTP not configured — skipping email notification")
    return
  }

  const from = process.env.SMTP_FROM ?? "ARP Notifications <noreply@si-ware.com>"
  const moduleLabel = req.module.charAt(0).toUpperCase() + req.module.slice(1)

  try {
    await transport.sendMail({
      from,
      to: adminEmails.join(", "),
      subject: `[ARP] New ${moduleLabel} Request: ${req.id} – ${req.title}`,
      html: newRequestHtml(req),
    })
    console.log(`[mailer] Notification sent for ${req.id} to ${adminEmails.length} admin(s)`)
  } catch (err) {
    // Never crash the request flow because of email failure
    console.error("[mailer] Failed to send notification:", err)
  }
}
