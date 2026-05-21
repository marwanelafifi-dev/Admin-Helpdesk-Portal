import nodemailer from "nodemailer"
import fs from "fs"
import path from "path"
import { readEmailConfig } from "./emailConfig"

function getLogoBuffer(): Buffer | null {
  try {
    const logoPath = path.join(process.cwd(), "public", "siware-logo.png")
    return fs.readFileSync(logoPath)
  } catch {
    return null
  }
}

/**
 * SMTP transporter cache — share a single pooled connection across all calls
 * instead of opening a new connection per email.
 *
 * Why this matters: Gmail (and most SMTP servers) throttle by IP and reject
 * with `421 4.7.0 Try again later, closing connection. (EHLO)` when a single
 * client opens many connections in quick succession. A request submission
 * fires 5+ notifications back-to-back; without pooling each one tried to
 * authenticate a fresh connection and Gmail killed them all.
 *
 * `pool: true` keeps a small set of connections alive; nodemailer queues
 * sends through them, throttled by `rateLimit`. The transporter is rebuilt
 * only when the saved config changes.
 */
let cachedTransporter: ReturnType<typeof nodemailer.createTransport> | null = null
let cachedTransporterKey: string | null = null

function configKey(saved: ReturnType<typeof readEmailConfig>) {
  if (saved?.method && saved?.values) {
    return `${saved.method}|${saved.values.smtp_user ?? ""}|${saved.values.smtp_password ?? ""}`
  }
  return `env|${process.env.SMTP_HOST ?? ""}|${process.env.SMTP_USER ?? ""}|${process.env.SMTP_PASSWORD ?? ""}|${process.env.SMTP_PORT ?? ""}`
}

const POOL_OPTIONS = {
  pool: true,
  // Gmail aggressively throttles concurrent SMTP connections from the same
  // sender. One persistent connection is the sweet spot for our volume.
  maxConnections: 1,
  maxMessages: 100,
  // Two-second window with at most one message per second keeps us well
  // under Gmail's per-connection burst limits.
  rateDelta: 2000,
  rateLimit: 1,
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 60000,
  tls: { rejectUnauthorized: false },
} as const

function createTransporter() {
  const saved = readEmailConfig()
  const key = configKey(saved)

  if (cachedTransporter && cachedTransporterKey === key) {
    return cachedTransporter
  }
  if (cachedTransporter) {
    // Config changed — tear down the old pool before replacing.
    try { cachedTransporter.close() } catch {}
    cachedTransporter = null
  }

  let transporter: ReturnType<typeof nodemailer.createTransport>
  if (saved?.method && saved?.values) {
    const v = saved.values
    if (saved.method === "gmail_app_password") {
      transporter = nodemailer.createTransport({
        host: "smtp.gmail.com", port: 465, secure: true,
        auth: { user: v.smtp_user, pass: v.smtp_password },
        ...POOL_OPTIONS,
      })
    } else if (saved.method === "smtp_relay") {
      transporter = nodemailer.createTransport({
        host: "smtp-relay.gmail.com", port: 587, secure: false,
        auth: { user: v.smtp_user, pass: v.smtp_password },
        ...POOL_OPTIONS,
      })
    } else {
      // Unknown saved method — fall through to env-based config below.
      const port = parseInt(process.env.SMTP_PORT || "587")
      const secure = process.env.SMTP_SECURE === "true" || port === 465
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "mail.si-ware.com",
        port, secure,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
        ...POOL_OPTIONS,
      })
    }
  } else {
    const port = parseInt(process.env.SMTP_PORT || "587")
    const secure = process.env.SMTP_SECURE === "true" || port === 465
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "mail.si-ware.com",
      port, secure,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
      ...POOL_OPTIONS,
    })
  }

  cachedTransporter = transporter
  cachedTransporterKey = key
  return transporter
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function getBaseUrl() {
  return process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3003"
}

function getMailDomain() {
  const fromEmail = process.env.SMTP_USER || "adminhelpdesk@si-ware.com"
  return fromEmail.split("@")[1] || "si-ware.com"
}

function getRequestThreadHeaders(requestId: string) {
  const normalizedRequestId = requestId.toLowerCase().replace(/[^a-z0-9-]/g, "-")
  const domain = getMailDomain()
  const rootMessageId = `<admin-helpdesk-request-${normalizedRequestId}@${domain}>`
  const messageId = `<admin-helpdesk-request-${normalizedRequestId}-${Date.now()}@${domain}>`

  return {
    messageId,
    inReplyTo: rootMessageId,
    references: rootMessageId,
  }
}

function getReplyToAddress(requestId: string) {
  const replyToBase =
    process.env.EMAIL_REPLY_TO ||
    process.env.SMTP_REPLY_TO ||
    process.env.SMTP_USER ||
    "adminhelpdesk@si-ware.com"

  if (!replyToBase.includes("@")) return undefined

  const [localPart, domain] = replyToBase.split("@")
  const normalizedRequestId = requestId.toLowerCase().replace(/[^a-z0-9-]/g, "-")
  return `${localPart}+request-${normalizedRequestId}@${domain}`
}

export function getRequestEmailSubject(requestTitle: string, requestId: string) {
  return `${requestTitle} - ${requestId}`
}

async function sendMailWithRetry(transporter: any, mailOptions: any, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await transporter.sendMail(mailOptions)
    } catch (error) {
      const err = error as Error
      const msg = err.message || ""
      // Gmail rate-limit responses always look like "421 4.7.0 ...". When we
      // see those, wait longer than usual so the per-IP throttle has time
      // to clear before the next attempt.
      const isThrottle = /\b421\b/.test(msg) || msg.includes("Try again later")
      console.error(`Email send attempt ${attempt} failed${isThrottle ? " (throttled)" : ""}:`, msg)

      if (attempt < maxRetries) {
        // Throttle: 6s, 18s. Other errors: 2s, 4s.
        const baseMs = isThrottle ? 6000 * attempt : Math.pow(2, attempt) * 1000
        await new Promise(r => setTimeout(r, baseMs))
        continue
      }

      console.error(`Email delivery failed after ${maxRetries} attempts:`, {
        to: mailOptions.to,
        subject: mailOptions.subject,
        error: msg,
      })
      throw error
    }
  }
}

export async function sendWelcomeEmail(params: {
  to: string
  name: string
  password: string
  loginUrl: string
}) {
  const transporter = createTransporter()

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, sans-serif; background: #f4f6f8; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: #0f172a; padding: 32px 40px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.3px; }
    .header p { color: #94a3b8; margin: 6px 0 0; font-size: 13px; }
    .body { padding: 36px 40px; }
    .body p { color: #374151; font-size: 14px; line-height: 1.7; margin: 0 0 16px; }
    .credentials { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px 24px; margin: 24px 0; }
    .credentials table { width: 100%; border-collapse: collapse; }
    .credentials td { padding: 8px 0; font-size: 14px; color: #374151; }
    .credentials td:first-child { font-weight: 600; color: #64748b; width: 100px; }
    .credentials td:last-child { font-family: monospace; font-size: 14px; color: #0f172a; }
    .btn { display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 14px; font-weight: 600; margin: 8px 0 24px; }
    .warning { background: #fefce8; border: 1px solid #fde047; border-radius: 6px; padding: 12px 16px; font-size: 13px; color: #854d0e; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 40px; text-align: center; }
    .footer p { color: #94a3b8; font-size: 12px; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Si-Ware Systems</h1>
      <p>Admin Helpdesk Portal</p>
    </div>
    <div class="body">
      <p>Hello <strong>${params.name}</strong>,</p>
      <p>Your account on the <strong>Si-Ware Systems Admin Helpdesk Portal</strong> has been created. You can now log in using the credentials below.</p>

      <div class="credentials">
        <table>
          <tr>
            <td>Portal URL</td>
            <td><a href="${params.loginUrl}" style="color:#2563eb;">${params.loginUrl}</a></td>
          </tr>
          <tr>
            <td>Email</td>
            <td>${params.to}</td>
          </tr>
          <tr>
            <td>Password</td>
            <td>${params.password}</td>
          </tr>
        </table>
      </div>

      <a href="${params.loginUrl}" class="btn">Sign in to Portal</a>

      <div class="warning">
        ⚠️ Please change your password after your first login. Keep your credentials confidential and do not share them with anyone.
      </div>
    </div>
    <div class="footer">
      <p>This is an automated message from Si-Ware Systems IT Team &nbsp;·&nbsp; adminhelpdesk@si-ware.com</p>
      <p style="margin-top:4px;">If you did not expect this email, please contact the IT Helpdesk immediately.</p>
    </div>
  </div>
</body>
</html>
`

  await sendMailWithRetry(transporter, {
    from: process.env.SMTP_FROM || "Si-Ware IT Helpdesk <ithelpdesk@si-ware.com>",
    to: params.to,
    subject: "Si-Ware Systems Admin Portal — Your Account Credentials",
    html,
  })
}

export async function sendRequestUpdateEmail(params: {
  to: string[]
  cc?: string[]
  updateType: "status" | "comment" | "request_updated"
  requestId: string
  requestTitle: string
  module: string
  actorName?: string
  preview?: string
  previousStatus?: string
  newStatus?: string
}) {
  const recipients = Array.from(new Set(params.to.filter(Boolean)))
  if (recipients.length === 0) return

  const transporter = createTransporter()
  const actionUrl = `${getBaseUrl()}/requests/${encodeURIComponent(params.requestId)}`
  const actor = params.actorName || "A team member"
  const moduleLabel = params.module.charAt(0).toUpperCase() + params.module.slice(1)
  const threadHeaders = getRequestThreadHeaders(params.requestId)
  const replyTo = getReplyToAddress(params.requestId)

  const subject = getRequestEmailSubject(params.requestTitle, params.requestId)

  const isNewRequest = params.updateType === "request_updated"

  const headline =
    params.updateType === "status"
      ? "Request status updated"
      : params.updateType === "comment"
      ? "New comment added"
      : "New request added"

  const bodyLine =
    isNewRequest
      ? `<strong>${escapeHtml(actor)}</strong> submitted a new request in the Admin Helpdesk Portal.`
      : `<strong>${escapeHtml(actor)}</strong> updated a request in the Admin Helpdesk Portal.`

  const detail =
    params.updateType === "status"
      ? `Status changed${params.previousStatus ? ` from ${params.previousStatus}` : ""}${params.newStatus ? ` to ${params.newStatus}` : ""}.`
      : params.preview || "A new update was added to the request."

  const logoBuffer = getLogoBuffer()
  const logoHtml = logoBuffer
    ? `<img src="cid:siware-logo" alt="Si-Ware Systems" style="height:44px;width:auto;display:block;margin:0 auto 14px;" />`
    : `<p style="margin:0 0 8px;color:#94a3b8;font-size:13px;letter-spacing:1px;text-transform:uppercase;">Si-Ware Systems</p>`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, sans-serif; background: #f4f6f8; margin: 0; padding: 0; }
    .container { max-width: 640px; margin: 32px auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
    .header { background: #0f172a; padding: 24px 32px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; }
    .body { padding: 28px 32px; color: #374151; font-size: 14px; line-height: 1.6; }
    .meta { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0; }
    .meta div { margin: 6px 0; }
    .label { color: #64748b; font-weight: 600; display: inline-block; min-width: 96px; }
    .btn { display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; padding: 11px 18px; border-radius: 6px; font-weight: 600; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 32px; color: #94a3b8; font-size: 12px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${logoHtml}
      <h1>${escapeHtml(headline)}</h1>
    </div>
    <div class="body">
      <p>${bodyLine}</p>
      <div class="meta">
        <div><span class="label">Request</span>${escapeHtml(params.requestTitle)}</div>
        <div><span class="label">Request ID</span>${escapeHtml(params.requestId)}</div>
        <div><span class="label">Module</span>${escapeHtml(moduleLabel)}</div>
        <div><span class="label">Update</span>${escapeHtml(detail)}</div>
      </div>
      <a href="${actionUrl}" class="btn">Open request</a>
    </div>
    <div class="footer">This is an automated notification from Si-Ware Systems Admin Helpdesk Portal.</div>
  </div>
</body>
</html>
`

  await sendMailWithRetry(transporter, {
    from: process.env.SMTP_FROM || "Si-Ware IT Helpdesk <ithelpdesk@si-ware.com>",
    to: recipients,
    cc: params.cc?.filter(Boolean),
    replyTo,
    subject,
    messageId: threadHeaders.messageId,
    inReplyTo: threadHeaders.inReplyTo,
    references: threadHeaders.references,
    headers: {
      "X-ARP-Request-ID": params.requestId,
      "X-ARP-Update-Type": params.updateType,
    },
    html,
    ...(logoBuffer ? {
      attachments: [{
        filename: "siware-logo.png",
        content: logoBuffer,
        cid: "siware-logo",
        contentType: "image/png",
      }],
    } : {}),
  })
}

export async function sendFeedbackSurveyEmail(params: {
  surveyId: string
  requesterName: string
  requesterEmail: string
  requestId: string
  requestTitle: string
  module: string
}) {
  const transporter = createTransporter()
  const baseUrl = getBaseUrl()
  const surveyUrl = `${baseUrl}/feedback-survey?id=${params.surveyId}`
  const moduleLabel = params.module.charAt(0).toUpperCase() + params.module.slice(1)
  const subject = `How was your ${moduleLabel} request? — ${params.requestTitle}`

  const stars = (filled: number) =>
    [1,2,3,4,5].map((s) =>
      s <= filled
        ? `<span style="color:#f59e0b;font-size:28px;">&#9733;</span>`
        : `<span style="color:#d1d5db;font-size:28px;">&#9733;</span>`
    ).join("")

  const ratingRows = [
    { label: "Excellent", stars: 5, color: "#059669" },
    { label: "Very Good", stars: 4, color: "#2563eb" },
    { label: "Good",      stars: 3, color: "#7c3aed" },
    { label: "Fair",      stars: 2, color: "#d97706" },
    { label: "Poor",      stars: 1, color: "#dc2626" },
  ]

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

      <!-- Header -->
      <tr>
        <td style="background:linear-gradient(135deg,#1e293b 0%,#334155 100%);padding:30px 40px 28px;text-align:center;">
          <img src="cid:siware-logo" alt="Si-Ware Systems" style="height:48px;width:auto;margin-bottom:16px;display:block;margin-left:auto;margin-right:auto;" />
          <div style="width:100%;height:1px;background:rgba(255,255,255,0.1);margin-bottom:18px;"></div>
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Your Request is Completed ✓</h1>
          <p style="margin:8px 0 0;color:#cbd5e1;font-size:14px;">We'd love to hear how we did</p>
        </td>
      </tr>

      <!-- Request Info -->
      <tr>
        <td style="padding:28px 40px 0;">
          <p style="margin:0 0 6px;color:#6b7280;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Request</p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;">
            <p style="margin:0;font-size:15px;font-weight:600;color:#1e293b;">${escapeHtml(params.requestTitle)}</p>
            <p style="margin:4px 0 0;font-size:13px;color:#64748b;">${params.requestId} &bull; ${moduleLabel}</p>
          </div>
        </td>
      </tr>

      <!-- Greeting -->
      <tr>
        <td style="padding:24px 40px 0;">
          <p style="margin:0;font-size:15px;color:#374151;">Hi <strong>${escapeHtml(params.requesterName)}</strong>,</p>
          <p style="margin:10px 0 0;font-size:15px;color:#374151;line-height:1.6;">
            Your <strong>${moduleLabel}</strong> request has been completed. We'd appreciate your feedback to help us improve our services.
          </p>
        </td>
      </tr>

      <!-- Star Rating Visual -->
      <tr>
        <td style="padding:28px 40px 0;">
          <p style="margin:0 0 16px;font-size:15px;font-weight:600;color:#1e293b;text-align:center;">How would you rate this service?</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${ratingRows.map((r) => `
            <tr>
              <td style="padding:6px 0;">
                <a href="${surveyUrl}&rating=${r.stars}" style="display:block;text-decoration:none;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;transition:all 0.2s;">
                    <tr>
                      <td style="padding:12px 16px;width:40px;text-align:center;">
                        <span style="font-size:20px;font-weight:700;color:${r.color};">${r.stars}</span>
                      </td>
                      <td style="padding:12px 8px;">
                        ${stars(r.stars)}
                      </td>
                      <td style="padding:12px 16px;text-align:right;">
                        <span style="font-size:14px;font-weight:600;color:${r.color};">${r.label}</span>
                      </td>
                    </tr>
                  </table>
                </a>
              </td>
            </tr>`).join("")}
          </table>
        </td>
      </tr>

      <!-- CTA Button -->
      <tr>
        <td style="padding:28px 40px 0;text-align:center;">
          <a href="${surveyUrl}" style="display:inline-block;background:#059669;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:8px;letter-spacing:0.3px;">
            &#9733; Submit My Feedback
          </a>
          <p style="margin:12px 0 0;font-size:12px;color:#9ca3af;">Or click a star rating above to submit directly</p>
        </td>
      </tr>

      <!-- Comment Section -->
      <tr>
        <td style="padding:20px 40px 0;">
          <div style="border:1px solid #e2e8f0;border-radius:8px;padding:20px;background:#f8fafc;">
            <p style="margin:0 0 10px;font-size:14px;font-weight:600;color:#1e293b;">💬 Add your comments (optional)</p>
            <div style="background:#ffffff;border:1px solid #d1d5db;border-radius:6px;padding:12px;min-height:72px;">
              <p style="margin:0;font-size:13px;color:#9ca3af;font-style:italic;">Click "Submit My Feedback" above to open the full survey and add detailed comments.</p>
            </div>
            <div style="margin-top:12px;text-align:right;">
              <a href="${surveyUrl}" style="display:inline-block;background:#1e293b;color:#ffffff;font-size:13px;font-weight:600;text-decoration:none;padding:9px 22px;border-radius:6px;">
                Open Full Survey →
              </a>
            </div>
          </div>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding:28px 40px 32px;border-top:1px solid #f1f5f9;margin-top:28px;">
          <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;line-height:1.6;">
            This survey was sent because your request <strong>${params.requestId}</strong> was completed.<br>
            Si-Ware Systems &bull; Admin Portal
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`

  const surveyLogoBuffer = getLogoBuffer()
  await sendMailWithRetry(transporter, {
    from: process.env.SMTP_FROM || `Si-Ware Admin Helpdesk <${process.env.SMTP_USER}>`,
    to: params.requesterEmail,
    subject,
    html,
    ...(surveyLogoBuffer ? {
      attachments: [{
        filename: "siware-logo.png",
        content: surveyLogoBuffer,
        cid: "siware-logo",
        contentType: "image/png",
      }],
    } : {}),
  })
}
