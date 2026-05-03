import nodemailer from "nodemailer"
import type { EngineRequest } from "./requests-api"

// Returns null when SMTP is not configured — callers should handle gracefully
function getTransport() {
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!user || !pass) return null

  const port = Number(process.env.SMTP_PORT ?? 465)
  const host = process.env.SMTP_HOST ?? "smtp.gmail.com"
  
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports
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
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Request Notification</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f8fafc; margin: 0; padding: 20px; line-height: 1.6;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1e40af 0%, #3730a3 100%); padding: 32px 40px; text-align: center;">
      <div style="background: rgba(255, 255, 255, 0.15); border-radius: 50%; width: 48px; height: 48px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">New ${moduleLabel} Request</h1>
      <p style="color: rgba(255, 255, 255, 0.8); margin: 8px 0 0; font-size: 14px;">Admin Request Platform</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px;">
      <div style="background: #f1f5f9; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
        <h2 style="color: #1e293b; margin: 0 0 16px; font-size: 18px; font-weight: 600;">Request Details</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #64748b; width: 140px; font-weight: 500;">Request ID</td>
            <td style="padding: 8px 0; font-weight: 600; color: #1e293b;">${req.id}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-weight: 500;">Module</td>
            <td style="padding: 8px 0; font-weight: 600; color: #1e293b;">${moduleLabel}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-weight: 500;">Title</td>
            <td style="padding: 8px 0; font-weight: 600; color: #1e293b;">${req.title}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-weight: 500;">Submitted by</td>
            <td style="padding: 8px 0; font-weight: 600; color: #1e293b;">${req.requesterName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-weight: 500;">Email</td>
            <td style="padding: 8px 0; color: #1e293b;">${req.requesterEmail}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-weight: 500;">Date</td>
            <td style="padding: 8px 0; color: #1e293b;">${new Date(req.createdAt).toLocaleString("en-GB", { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric', 
              hour: '2-digit', 
              minute: '2-digit' 
            })}</td>
          </tr>
        </table>
      </div>
      
      <div style="text-align: center;">
        <a href="${url}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); transition: all 0.2s ease;">View Request Details</a>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #64748b; margin: 0; font-size: 12px;">This is an automated notification from the Admin Request Platform</p>
      <p style="color: #94a3b8; margin: 8px 0 0; font-size: 11px;">Please do not reply to this email</p>
    </div>
  </div>
</body>
</html>`
}

function statusChangeHtml(req: EngineRequest, newStatus: string): string {
  const moduleLabel = req.module.charAt(0).toUpperCase() + req.module.slice(1)
  const url = `${process.env.NEXTAUTH_URL ?? "http://localhost:3003"}/admin/all-requests`
  
  const statusColors = {
    new: '#10b981',
    on_hold: '#f59e0b',
    in_transit: '#3b82f6',
    delivered: '#10b981',
    completed: '#10b981',
    cancelled: '#ef4444',
    rejected: '#ef4444',
    approved: '#10b981'
  }
  
  const statusLabels = {
    new: 'New',
    on_hold: 'On Hold',
    in_transit: 'In Transit',
    delivered: 'Delivered',
    completed: 'Completed',
    cancelled: 'Cancelled',
    rejected: 'Rejected',
    approved: 'Approved'
  }

  const statusColor = statusColors[newStatus as keyof typeof statusColors] || '#64748b'
  const statusLabel = statusLabels[newStatus as keyof typeof statusLabels] || newStatus

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Status Update Notification</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f8fafc; margin: 0; padding: 20px; line-height: 1.6;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1e40af 0%, #3730a3 100%); padding: 32px 40px; text-align: center;">
      <div style="background: rgba(255, 255, 255, 0.15); border-radius: 50%; width: 48px; height: 48px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">Request Status Updated</h1>
      <p style="color: rgba(255, 255, 255, 0.8); margin: 8px 0 0; font-size: 14px;">Admin Request Platform</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px;">
      <div style="background: #f1f5f9; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
        <h2 style="color: #1e293b; margin: 0 0 16px; font-size: 18px; font-weight: 600;">Request Information</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #64748b; width: 140px; font-weight: 500;">Request ID</td>
            <td style="padding: 8px 0; font-weight: 600; color: #1e293b;">${req.id}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-weight: 500;">Module</td>
            <td style="padding: 8px 0; font-weight: 600; color: #1e293b;">${moduleLabel}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-weight: 500;">Title</td>
            <td style="padding: 8px 0; font-weight: 600; color: #1e293b;">${req.title}</td>
          </tr>
        </table>
      </div>
      
      <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 24px; margin-bottom: 24px; text-align: center;">
        <h3 style="color: #1e293b; margin: 0 0 12px; font-size: 16px; font-weight: 600;">Status Update</h3>
        <div style="display: inline-block; background: ${statusColor}; color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; margin-bottom: 8px;">
          ${statusLabel}
        </div>
        <p style="color: #64748b; margin: 8px 0 0; font-size: 13px;">Your request status has been updated</p>
      </div>
      
      <div style="text-align: center;">
        <a href="${url}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); transition: all 0.2s ease;">View Request Details</a>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #64748b; margin: 0; font-size: 12px;">This is an automated notification from the Admin Request Platform</p>
      <p style="color: #94a3b8; margin: 8px 0 0; font-size: 11px;">Please do not reply to this email</p>
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
      subject: `[New Ticket] - Request #${req.id}`,
      html: newRequestHtml(req),
    })
    console.log(`[mailer] New request notification sent for ${req.id} to ${adminEmails.length} admin(s)`)
  } catch (err) {
    // Never crash the request flow because of email failure
    console.error("[mailer] Failed to send new request notification:", err)
  }
}

export async function sendStatusChangeNotification(req: EngineRequest, newStatus: string, requesterEmail: string) {
  if (!requesterEmail) return

  const transport = getTransport()
  if (!transport) {
    console.warn("[mailer] SMTP not configured — skipping email notification")
    return
  }

  const from = process.env.SMTP_FROM ?? "ARP Notifications <noreply@si-ware.com>"

  try {
    await transport.sendMail({
      from,
      to: requesterEmail,
      subject: `[Update] - Your Request #${req.id} has been updated to ${newStatus}`,
      html: statusChangeHtml(req, newStatus),
    })
    console.log(`[mailer] Status change notification sent for ${req.id} to ${requesterEmail}`)
  } catch (err) {
    // Never crash the request flow because of email failure
    console.error("[mailer] Failed to send status change notification:", err)
  }
}

// Helper function to send emails asynchronously without blocking
export function sendEmailAsync(emailFn: () => Promise<void>) {
  // Fire and forget - don't await, don't block the main thread
  emailFn().catch(err => {
    console.error("[mailer] Async email error:", err)
  })
}
