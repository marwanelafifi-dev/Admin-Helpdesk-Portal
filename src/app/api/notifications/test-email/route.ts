import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { config } = await req.json()
  const { method, values } = config

  try {
    const toEmail = session.user.email!
    const fromName = values.smtp_from_name || "Si-Ware Admin Portal"
    const fromEmail = values.smtp_user || "noreply@si-ware.com"

    if (method === "sendgrid") {
      const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${values.api_key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: toEmail }] }],
          from: { email: fromEmail, name: fromName },
          subject: "✅ Admin Portal — Email Test",
          content: [{ type: "text/html", value: testHtml(fromName) }],
        }),
      })
      if (!res.ok) {
        const err = await res.text()
        return NextResponse.json({ message: `SendGrid error: ${err}` }, { status: 500 })
      }
      return NextResponse.json({ message: `Test email sent to ${toEmail} via SendGrid` })
    }

    if (method === "brevo") {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": values.api_key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender: { email: fromEmail, name: fromName },
          to: [{ email: toEmail }],
          subject: "✅ Admin Portal — Email Test",
          htmlContent: testHtml(fromName),
        }),
      })
      if (!res.ok) {
        const err = await res.text()
        return NextResponse.json({ message: `Brevo error: ${err}` }, { status: 500 })
      }
      return NextResponse.json({ message: `Test email sent to ${toEmail} via Brevo` })
    }

    // SMTP-based methods (gmail_app_password, gmail_oauth2, smtp_relay, ses)
    const nodemailer = await import("nodemailer")
    let transportConfig: any

    if (method === "gmail_app_password") {
      transportConfig = {
        host: "smtp.gmail.com", port: 465, secure: true,
        auth: { user: values.smtp_user, pass: values.smtp_password },
        tls: { rejectUnauthorized: false },
      }
    } else if (method === "gmail_oauth2") {
      transportConfig = {
        host: "smtp.gmail.com", port: 465, secure: true,
        auth: {
          type: "OAuth2",
          user: values.smtp_user,
          clientId: values.oauth2_client_id,
          clientSecret: values.oauth2_client_secret,
          refreshToken: values.oauth2_refresh_token,
        },
      }
    } else if (method === "smtp_relay") {
      transportConfig = {
        host: "smtp-relay.gmail.com", port: 587, secure: false,
        auth: { user: values.smtp_user, pass: values.smtp_password },
        tls: { rejectUnauthorized: false },
      }
    } else if (method === "ses") {
      transportConfig = {
        host: `email-smtp.${values.aws_region || "us-east-1"}.amazonaws.com`,
        port: 587, secure: false,
        auth: { user: values.aws_access_key, pass: values.aws_secret_key },
      }
    }

    const transporter = nodemailer.default.createTransport(transportConfig)
    await transporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to: toEmail,
      subject: "✅ Admin Portal — Email Test",
      html: testHtml(fromName),
    })

    return NextResponse.json({ message: `Test email sent to ${toEmail}` })
  } catch (err: any) {
    return NextResponse.json({ message: `Failed: ${err?.message ?? "Unknown error"}` }, { status: 500 })
  }
}

function testHtml(fromName: string) {
  return `
<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px;">
  <div style="background:#059669;color:white;text-align:center;padding:20px;border-radius:8px;margin-bottom:24px;">
    <div style="font-size:32px;margin-bottom:8px;">✅</div>
    <h2 style="margin:0;font-size:20px;">Email Configuration Working!</h2>
  </div>
  <p style="color:#374151;font-size:15px;line-height:1.6;">
    This is a test email from <strong>${fromName}</strong> confirming that your notification configuration is set up correctly.
  </p>
  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-top:16px;">
    <p style="margin:0;color:#15803d;font-size:13px;">
      ✓ SMTP connection established<br>
      ✓ Authentication successful<br>
      ✓ Email delivered successfully
    </p>
  </div>
  <p style="color:#9ca3af;font-size:12px;margin-top:24px;text-align:center;">Si-Ware Systems — Admin Portal</p>
</div>`
}
