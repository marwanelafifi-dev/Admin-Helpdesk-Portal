import { NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"

export const runtime = "nodejs"

interface TestEmailPayload {
  to?: string
  testSmtpConfig?: boolean
}

async function testSmtpConnection() {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
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
  })

  try {
    await transporter.verify()
    return {
      success: true,
      message: "SMTP connection verified successfully",
      config: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_SECURE === "true",
        user: process.env.SMTP_USER,
      },
    }
  } catch (error) {
    const err = error as Error
    return {
      success: false,
      message: `SMTP verification failed: ${err.message}`,
      error: err.message,
      config: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_SECURE === "true",
        user: process.env.SMTP_USER,
      },
    }
  }
}

async function sendTestEmail(recipientEmail: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
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
  })

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, sans-serif; background: #f4f6f8; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: #0f172a; padding: 32px 40px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; }
    .body { padding: 36px 40px; color: #374151; font-size: 14px; line-height: 1.7; }
    .success { background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin: 20px 0; color: #166534; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Email Configuration Test</h1>
    </div>
    <div class="body">
      <p>Hello,</p>
      <p>This is a test email to verify that your email system is working correctly.</p>
      <div class="success">
        <strong>✓ Success!</strong><br>
        Your SMTP configuration is working and emails can be sent through the Admin Request Platform.
      </div>
      <p>Sent at: ${new Date().toISOString()}</p>
      <p>If you received this email, your notification system is operational.</p>
    </div>
  </div>
</body>
</html>
`

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "Si-Ware IT Helpdesk <ithelpdesk@si-ware.com>",
      to: recipientEmail,
      subject: "Admin Request Platform - Email Test",
      html,
    })

    return {
      success: true,
      message: `Test email sent to ${recipientEmail}`,
    }
  } catch (error) {
    const err = error as Error
    return {
      success: false,
      message: `Failed to send test email: ${err.message}`,
      error: err.message,
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TestEmailPayload

    if (body.testSmtpConfig) {
      const result = await testSmtpConnection()
      return NextResponse.json(result)
    }

    if (!body.to) {
      return NextResponse.json(
        { error: "Email address (to) is required" },
        { status: 400 }
      )
    }

    const result = await sendTestEmail(body.to)
    return NextResponse.json(result)
  } catch (error) {
    console.error("[email-test] Error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to test email",
      },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const testSmtp = searchParams.get("testSmtp") === "true"

    if (testSmtp) {
      const result = await testSmtpConnection()
      return NextResponse.json(result)
    }

    return NextResponse.json({ message: "Email test endpoint available" })
  } catch (error) {
    console.error("[email-test] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to test email" },
      { status: 500 }
    )
  }
}
