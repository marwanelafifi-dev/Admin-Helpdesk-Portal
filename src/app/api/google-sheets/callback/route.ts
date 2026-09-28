import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { consumeGoogleSheetsExportJob } from "@/lib/googleSheetsExportStore"
import { logServerAudit } from "@/lib/serverAuditLog"

export const runtime = "nodejs"

function baseUrl(request: NextRequest) {
  return (process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? new URL(request.url).origin).replace(/\/$/, "")
}

function redirectUri(request: NextRequest) {
  return process.env.GOOGLE_SHEETS_REDIRECT_URI?.trim() || `${baseUrl(request)}/api/google-sheets/callback`
}

function errorPage(message: string, status = 400) {
  return new NextResponse(`<!doctype html><html><body style="font-family:Arial,sans-serif;background:#eef5ff;padding:40px;color:#102a4c"><main style="max-width:560px;margin:auto;background:#fff;border:1px solid #cfe0f2;border-radius:14px;padding:28px"><h1 style="margin-top:0">Google Sheet was not created</h1><p>${message}</p><p><a href="/landing">Return to the portal</a></p></main></body></html>`, { status, headers: { "Content-Type": "text/html; charset=utf-8" } })
}

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return errorPage("Please sign in to the portal, then start the export again.", 401)

  const code = request.nextUrl.searchParams.get("code")
  const state = request.nextUrl.searchParams.get("state")
  const oauthError = request.nextUrl.searchParams.get("error")
  if (oauthError) return errorPage("Google authorization was cancelled. No spreadsheet was created.")
  if (!code || !state) return errorPage("The Google authorization response was incomplete. Start the export again.")

  const job = consumeGoogleSheetsExportJob(state, session.user.id)
  if (!job) return errorPage("This export link has expired or was already used. Start a new export from the portal.")

  const clientId = process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) return errorPage("Google Sheets credentials are not configured for this portal.", 503)

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code, client_id: clientId, client_secret: clientSecret,
        redirect_uri: redirectUri(request), grant_type: "authorization_code",
      }),
    })
    const token = await tokenResponse.json().catch(() => null) as { access_token?: string; error_description?: string } | null
    if (!tokenResponse.ok || !token?.access_token) throw new Error(token?.error_description || "Google did not issue an access token.")

    const createResponse = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
      method: "POST",
      headers: { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ properties: { title: job.title }, sheets: [{ properties: { title: "Requests", gridProperties: { frozenRowCount: 1 } } }] }),
    })
    const spreadsheet = await createResponse.json().catch(() => null) as { spreadsheetId?: string; spreadsheetUrl?: string; error?: { message?: string } } | null
    if (!createResponse.ok || !spreadsheet?.spreadsheetId || !spreadsheet.spreadsheetUrl) throw new Error(spreadsheet?.error?.message || "Google could not create the spreadsheet.")

    const valuesResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheet.spreadsheetId)}/values/Requests!A1?valueInputOption=RAW`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ majorDimension: "ROWS", values: job.values }),
    })
    if (!valuesResponse.ok) {
      const failure = await valuesResponse.json().catch(() => null) as { error?: { message?: string } } | null
      throw new Error(failure?.error?.message || "Google created the spreadsheet but could not add the request data.")
    }

    void fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheet.spreadsheetId)}:batchUpdate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ requests: [{ autoResizeDimensions: { dimensions: { sheetId: 0, dimension: "COLUMNS", startIndex: 0, endIndex: Math.min(job.values[0]?.length ?? 1, 30) } } }] }),
    }).catch(() => {})

    logServerAudit({
      actor: job.actor, actorEmail: job.actorEmail, action: "request_exported",
      targetId: spreadsheet.spreadsheetId, targetTitle: `${job.scope} Google Sheet`,
      details: `Google Sheet created with ${job.requestCount} request${job.requestCount === 1 ? "" : "s"}; modules: ${job.modules.join(", ") || "all visible"}.`,
      category: "system", outcome: "success", path: "/api/google-sheets/callback",
      functionName: job.modules.some((module) => module.startsWith("finance_")) ? "Finance" : undefined,
    })
    return NextResponse.redirect(spreadsheet.spreadsheetUrl)
  } catch (error) {
    console.error("[google-sheets] Export failed:", error)
    return errorPage("Google could not create the spreadsheet. Check that the Google Sheets API is enabled and the callback URL is registered, then try again.", 502)
  }
}
