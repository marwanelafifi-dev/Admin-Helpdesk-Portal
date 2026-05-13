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
    },
  })
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

  await transporter.sendMail({
    from: process.env.SMTP_FROM || "Si-Ware IT Helpdesk <ithelpdesk@si-ware.com>",
    to: params.to,
    subject: "Si-Ware Systems Admin Portal — Your Account Credentials",
    html,
  })
}
