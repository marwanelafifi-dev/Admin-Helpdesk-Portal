import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { createGoogleSheetsExportJob } from "@/lib/googleSheetsExportStore"

export const runtime = "nodejs"

const GOOGLE_SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets"
const MAX_ROWS = 5_000
const MAX_COLUMNS = 300
const MAX_CELL_LENGTH = 45_000

function baseUrl(request: NextRequest) {
  return (process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? new URL(request.url).origin).replace(/\/$/, "")
}

function redirectUri(request: NextRequest) {
  return process.env.GOOGLE_SHEETS_REDIRECT_URI?.trim() || `${baseUrl(request)}/api/google-sheets/callback`
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || !session.user.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const clientId = process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID
  if (!clientId) return NextResponse.json({ error: "Google Sheets is not configured for this portal." }, { status: 503 })

  const body = await request.json().catch(() => null) as { scope?: unknown; modules?: unknown; requestCount?: unknown; values?: unknown } | null
  const scope = typeof body?.scope === "string" ? body.scope.trim().slice(0, 160) : "Request export"
  const incomingValues = Array.isArray(body?.values) ? body.values : []
  if (incomingValues.length === 0 || incomingValues.length > MAX_ROWS + 1) {
    return NextResponse.json({ error: `Export must contain between 1 and ${MAX_ROWS} request rows.` }, { status: 400 })
  }

  let values: string[][]
  try {
    values = incomingValues.map((row) => {
      if (!Array.isArray(row) || row.length > MAX_COLUMNS) throw new Error("Invalid spreadsheet columns.")
      return row.map((cell) => String(cell ?? "").slice(0, MAX_CELL_LENGTH))
    })
  } catch {
    return NextResponse.json({ error: "The request data cannot be exported as a spreadsheet." }, { status: 400 })
  }
  const modules = Array.isArray(body?.modules)
    ? body.modules.filter((item): item is string => typeof item === "string").slice(0, 20)
    : []
  const requestCount = Math.max(0, Math.min(MAX_ROWS, Number(body?.requestCount) || Math.max(values.length - 1, 0)))
  const job = createGoogleSheetsExportJob({
    userId: session.user.id, actor: session.user.name ?? session.user.email, actorEmail: session.user.email,
    scope, modules, requestCount, title: `${scope} — ${new Date().toISOString().slice(0, 10)}`, values,
  })

  const authorize = new URL("https://accounts.google.com/o/oauth2/v2/auth")
  authorize.searchParams.set("client_id", clientId)
  authorize.searchParams.set("redirect_uri", redirectUri(request))
  authorize.searchParams.set("response_type", "code")
  authorize.searchParams.set("scope", GOOGLE_SHEETS_SCOPE)
  authorize.searchParams.set("include_granted_scopes", "true")
  authorize.searchParams.set("state", job.id)
  return NextResponse.json({ authorizationUrl: authorize.toString() })
}
