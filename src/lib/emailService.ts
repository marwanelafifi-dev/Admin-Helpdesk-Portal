import nodemailer from "nodemailer"

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "mail.si-ware.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
      minVersion: "TLSv1.2",
    },
    connectionTimeout: 10000,
    socketTimeout: 10000,
    pool: {
      maxConnections: 5,
      maxMessages: 100,
      rateDelta: 1000,
      rateLimit: 5,
    },
  })
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

async function sendMailWithRetry(transporter: any, mailOptions: any, maxRetries = 2) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await transporter.sendMail(mailOptions)
    } catch (error) {
      const err = error as Error
      console.error(`Email send attempt ${attempt} failed:`, err.message)

      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000))
        continue
      }

      console.error(`Email delivery failed after ${maxRetries} attempts:`, {
        to: mailOptions.to,
        subject: mailOptions.subject,
        error: err.message,
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

  const headline =
    params.updateType === "status"
      ? "Request status updated"
      : params.updateType === "comment"
      ? "New comment added"
      : "Request updated"

  const detail =
    params.updateType === "status"
      ? `Status changed${params.previousStatus ? ` from ${params.previousStatus}` : ""}${params.newStatus ? ` to ${params.newStatus}` : ""}.`
      : params.preview || "A new update was added to the request."

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, sans-serif; background: #f4f6f8; margin: 0; padding: 0; }
    .container { max-width: 640px; margin: 32px auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
    .header { background: #0f172a; padding: 24px 32px; }
    .header h1 { color: #ffffff; margin: 0; font-size: 20px; }
    .body { padding: 28px 32px; color: #374151; font-size: 14px; line-height: 1.6; }
    .meta { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0; }
    .meta div { margin: 6px 0; }
    .label { color: #64748b; font-weight: 600; display: inline-block; min-width: 96px; }
    .btn { display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; padding: 11px 18px; border-radius: 6px; font-weight: 600; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 32px; color: #94a3b8; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>${escapeHtml(headline)}</h1></div>
    <div class="body">
      <p><strong>${escapeHtml(actor)}</strong> updated a request in the Admin Helpdesk Portal.</p>
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
  })
}
