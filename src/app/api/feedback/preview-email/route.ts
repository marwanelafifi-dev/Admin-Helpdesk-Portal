import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export const runtime = "nodejs"

export async function GET() {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3003"
  const surveyUrl = `${baseUrl}/feedback-survey?id=FB-PREVIEW`

  // Embed logo as base64 so it shows in email clients
  let logoSrc = `${baseUrl}/siware-logo.png`
  try {
    const logoPath = path.join(process.cwd(), "public", "siware-logo.png")
    const logoB64 = fs.readFileSync(logoPath).toString("base64")
    logoSrc = `data:image/png;base64,${logoB64}`
  } catch {}

  const stars = (filled: number) =>
    [1, 2, 3, 4, 5]
      .map((s) =>
        s <= filled
          ? `<span style="color:#f59e0b;font-size:26px;">&#9733;</span>`
          : `<span style="color:#d1d5db;font-size:26px;">&#9733;</span>`
      )
      .join("")

  const ratingRows = [
    { label: "Excellent", stars: 5, color: "#059669" },
    { label: "Very Good", stars: 4, color: "#2563eb" },
    { label: "Good",      stars: 3, color: "#7c3aed" },
    { label: "Fair",      stars: 2, color: "#d97706" },
    { label: "Poor",      stars: 1, color: "#dc2626" },
  ]

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Feedback Survey Email Preview</title>
  <style>
    .rating-row { transition: background 0.15s; }
    .rating-row:hover { background: #f0f9ff !important; border-color: #bae6fd !important; }
    .submit-btn:hover { background: #047857 !important; }
    #comment-section { display: none; }
  </style>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">

<!-- Preview banner -->
<div style="background:#1e293b;color:#94a3b8;text-align:center;padding:10px 16px;font-size:12px;letter-spacing:1px;">
  ✉ EMAIL PREVIEW — This is exactly how the feedback survey email looks to the requester
</div>

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

      <!-- Header -->
      <tr>
        <td style="background:linear-gradient(135deg,#1e293b 0%,#334155 100%);padding:30px 40px 28px;text-align:center;">
          <img src="${logoSrc}" alt="Si-Ware Systems" style="height:48px;width:auto;margin-bottom:16px;display:block;margin-left:auto;margin-right:auto;" />
          <div style="width:100%;height:1px;background:rgba(255,255,255,0.1);margin-bottom:18px;"></div>
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Your Request is Completed ✓</h1>
          <p style="margin:8px 0 0;color:#cbd5e1;font-size:14px;">We'd love to hear how we did</p>
        </td>
      </tr>

      <!-- Request Info -->
      <tr>
        <td style="padding:28px 40px 0;">
          <p style="margin:0 0 8px;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Request</p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;">
            <p style="margin:0;font-size:16px;font-weight:600;color:#1e293b;">International Shipment to Dubai</p>
            <p style="margin:5px 0 0;font-size:13px;color:#64748b;">SHP-2026-0001 &bull; Shipping</p>
          </div>
        </td>
      </tr>

      <!-- Greeting -->
      <tr>
        <td style="padding:22px 40px 0;">
          <p style="margin:0;font-size:15px;color:#374151;">Hi <strong>Marwan Elafifi</strong>,</p>
          <p style="margin:10px 0 0;font-size:15px;color:#374151;line-height:1.7;">
            Your <strong>Shipping</strong> request has been completed. We'd appreciate your feedback to help us continuously improve our services.
          </p>
        </td>
      </tr>

      <!-- Star Ratings -->
      <tr>
        <td style="padding:26px 40px 0;">
          <p style="margin:0 0 16px;font-size:15px;font-weight:600;color:#1e293b;text-align:center;">How would you rate this service?</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${ratingRows.map((r) => `
            <tr>
              <td style="padding:4px 0;">
                <a href="${surveyUrl}&rating=${r.stars}" class="rating-row" style="display:block;text-decoration:none;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:13px 16px;width:36px;text-align:center;">
                        <span style="font-size:17px;font-weight:700;color:${r.color};">${r.stars}</span>
                      </td>
                      <td style="padding:13px 6px;">${stars(r.stars)}</td>
                      <td style="padding:13px 16px;text-align:right;">
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

      <!-- Submit Button (reveals comment box) -->
      <tr>
        <td style="padding:26px 40px 0;text-align:center;">
          <button onclick="document.getElementById('comment-section').style.display='block';this.style.display='none';"
            class="submit-btn"
            style="display:inline-block;background:#059669;color:#ffffff;font-size:15px;font-weight:600;border:none;cursor:pointer;padding:14px 40px;border-radius:8px;letter-spacing:0.3px;">
            &#9733;&nbsp; Submit My Feedback
          </button>
          <p style="margin:10px 0 0;font-size:12px;color:#9ca3af;">Or click a star rating above to submit directly</p>
        </td>
      </tr>

      <!-- Comment Section (hidden until Submit clicked) -->
      <tr>
        <td style="padding:0 40px;">
          <div id="comment-section" style="margin-top:20px;border:1px solid #e2e8f0;border-radius:8px;padding:20px;background:#f8fafc;">
            <p style="margin:0 0 10px;font-size:14px;font-weight:600;color:#1e293b;">💬 Add your comments (optional)</p>
            <textarea rows="4" placeholder="Tell us what we can improve or what went well..."
              style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:14px;color:#374151;resize:none;box-sizing:border-box;font-family:Arial,sans-serif;"></textarea>
            <div style="margin-top:12px;text-align:right;">
              <a href="${surveyUrl}"
                style="display:inline-block;background:#1e293b;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:10px 28px;border-radius:6px;">
                Send Feedback →
              </a>
            </div>
          </div>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding:24px 40px 32px;">
          <div style="border-top:1px solid #f1f5f9;padding-top:22px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.7;">
              This survey was sent because your request <strong>SHP-2026-0001</strong> was completed.<br>
              Si-Ware Systems &bull; Admin Portal
            </p>
          </div>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  })
}
