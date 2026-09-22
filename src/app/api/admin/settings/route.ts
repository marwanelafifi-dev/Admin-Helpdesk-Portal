import { NextRequest, NextResponse } from "next/server"
import { getToken } from "@auth/core/jwt"
import { loadSettingsServer, writeSettingsServer } from "@/lib/settingsServer"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  const settings = loadSettingsServer()
  return NextResponse.json({ settings })
}

export async function POST(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    secureCookie: req.nextUrl.protocol === "https:",
  })
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const permissions = (token.permissions as string[]) ?? []
  const role = token.role as string | undefined
  const isAdmin = role === "Full Access" || permissions.includes("settings") || permissions.includes("*")
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  if (body.financeSlaWorkingDays !== undefined || body.financeSlaReminderDay !== undefined) {
    const current = loadSettingsServer()
    const slaDays = Number.parseInt(String(body.financeSlaWorkingDays ?? current.financeSlaWorkingDays), 10)
    const reminderDay = Number.parseInt(String(body.financeSlaReminderDay ?? current.financeSlaReminderDay), 10)
    if (!Number.isInteger(slaDays) || slaDays < 2 || slaDays > 60 || !Number.isInteger(reminderDay) || reminderDay < 1 || reminderDay >= slaDays) {
      return NextResponse.json({ error: "Reminder day must be at least 1 and earlier than the Finance SLA deadline." }, { status: 400 })
    }
    body.financeSlaWorkingDays = String(slaDays)
    body.financeSlaReminderDay = String(reminderDay)
  }
  writeSettingsServer(body)
  return NextResponse.json({ success: true })
}
