import nodemailer from 'nodemailer'

// Initialize Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

/**
 * Send email using Nodemailer
 */
export async function sendEmail(options: EmailOptions) {
  try {
    const result = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@si-ware.com',
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    })

    console.log('Email sent:', result.messageId)
    return { success: true, messageId: result.messageId }
  } catch (error) {
    console.error('Failed to send email:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Email templates
 */

export const emailTemplates = {
  /**
   * New Request Submitted
   */
  newRequest: (
    requesterName: string,
    requestTitle: string,
    module: string,
    requestLink: string
  ) => ({
    subject: `New ${module} Request - ${requestTitle}`,
    html: `
      <h2>New Request Submitted</h2>
      <p><strong>${requesterName}</strong> submitted a new <strong>${module}</strong> request:</p>
      <p><strong>${requestTitle}</strong></p>
      <p>
        <a href="${requestLink}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
          View Request
        </a>
      </p>
      <p>Admin Request Platform</p>
    `,
    text: `New ${module} request from ${requesterName}: ${requestTitle}\n\nView it at: ${requestLink}`,
  }),

  /**
   * Request Approved
   */
  requestApproved: (
    requestTitle: string,
    approverName: string,
    requestLink: string
  ) => ({
    subject: `Request Approved - ${requestTitle}`,
    html: `
      <h2>Your Request Has Been Approved</h2>
      <p><strong>${requestTitle}</strong> has been approved by <strong>${approverName}</strong>.</p>
      <p>
        <a href="${requestLink}" style="background-color: #16a34a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
          View Details
        </a>
      </p>
      <p>Admin Request Platform</p>
    `,
    text: `Your request "${requestTitle}" has been approved.\n\nView it at: ${requestLink}`,
  }),

  /**
   * Request Rejected
   */
  requestRejected: (
    requestTitle: string,
    reason: string,
    requestLink: string
  ) => ({
    subject: `Request Rejected - ${requestTitle}`,
    html: `
      <h2>Your Request Has Been Rejected</h2>
      <p><strong>${requestTitle}</strong> has been rejected.</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>
        <a href="${requestLink}" style="background-color: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
          View Details
        </a>
      </p>
      <p>Admin Request Platform</p>
    `,
    text: `Your request "${requestTitle}" has been rejected.\n\nReason: ${reason}\n\nView it at: ${requestLink}`,
  }),
}
