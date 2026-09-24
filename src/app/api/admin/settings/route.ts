import { NextRequest, NextResponse } from "next/server"
import { getToken } from "@auth/core/jwt"
import { loadSettingsServer, writeSettingsServer } from "@/lib/settingsServer"
import { DEFAULT_MAIN_APPS, DEFAULT_PLATFORM_SETTINGS, type FeedbackFunctionId, type MainAppIcon, type SupportFunctionId } from "@/lib/platformSettings"

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
  if (body.itServiceDeskUrl !== undefined) {
    const url = String(body.itServiceDeskUrl).trim()
    if (url) {
      try {
        const parsed = new URL(url)
        if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("Unsupported protocol")
      } catch {
        return NextResponse.json({ error: "Enter a valid HTTP or HTTPS Service Desk URL." }, { status: 400 })
      }
    }
    body.itServiceDeskUrl = url
  }
  if (body.itServiceDeskEnabled !== undefined) body.itServiceDeskEnabled = Boolean(body.itServiceDeskEnabled)
  if (body.supportFunctionLogos !== undefined) {
    const current = loadSettingsServer().supportFunctionLogos
    const validSupportIds = ["administration", "people", "finance", "it"] as const
    const source = body.supportFunctionLogos && typeof body.supportFunctionLogos === "object" ? body.supportFunctionLogos : {}
    body.supportFunctionLogos = Object.fromEntries(validSupportIds.map((id) => {
      const value = String(source[id] ?? current[id] ?? "")
      return [id, /^\/api\/admin\/support-function-icons\/(administration|people|finance|it)(?:\?v=\d+)?$/.test(value) ? value : ""]
    }))
  }
  if (body.supportFunctionAvailability !== undefined) {
    const current = loadSettingsServer().supportFunctionAvailability
    const ids: SupportFunctionId[] = ["administration", "people", "finance", "it"]
    const source = body.supportFunctionAvailability && typeof body.supportFunctionAvailability === "object"
      ? body.supportFunctionAvailability
      : {}
    body.supportFunctionAvailability = Object.fromEntries(ids.map((id) => {
      const value = source[id] ?? current[id] ?? DEFAULT_PLATFORM_SETTINGS.supportFunctionAvailability[id]
      return [id, {
        enabled: Boolean(value.enabled),
        unavailableMessage: String(value.unavailableMessage ?? "").trim().slice(0, 180),
      }]
    }))
  }
  if (body.feedbackSurveysByFunction !== undefined) {
    const current = loadSettingsServer().feedbackSurveysByFunction
    const ids: FeedbackFunctionId[] = ["admin", "hr", "finance"]
    const source = body.feedbackSurveysByFunction && typeof body.feedbackSurveysByFunction === "object"
      ? body.feedbackSurveysByFunction
      : {}
    body.feedbackSurveysByFunction = Object.fromEntries(ids.map((id) => {
      const value = source[id] ?? current[id]
      return [id, {
        enabled: Boolean(value.enabled),
        subject: String(value.subject ?? "").trim().slice(0, 220),
        body: String(value.body ?? "").trim().slice(0, 4000),
      }]
    }))
  }
  if (body.mainApps !== undefined) {
    if (!Array.isArray(body.mainApps) || body.mainApps.length > 9) return NextResponse.json({ error: "Configure up to nine Main Apps." }, { status: 400 })
    const validIcons = new Set<MainAppIcon>(["headset", "monitor", "globe", "layout", "building", "users"])
    try {
      body.mainApps = DEFAULT_MAIN_APPS.map((fallback, index) => {
        const source = body.mainApps[index] ?? fallback
        const url = String(source.url ?? "").trim()
        const iconImage = String(source.iconImage ?? "")
        if (url) {
          const parsed = new URL(url)
          if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("Unsupported protocol")
        }
        return {
          id: fallback.id,
          name: String(source.name ?? "").trim().slice(0, 60),
          url,
          icon: validIcons.has(source.icon) ? source.icon : fallback.icon,
          iconImage: (/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/i.test(iconImage) && iconImage.length <= 1_100_000) || /^\/api\/admin\/main-app-icons\/main-app-[1-9](?:\?v=\d+)?$/.test(iconImage) ? iconImage : "",
          enabled: Boolean(source.enabled),
        }
      })
    } catch {
      return NextResponse.json({ error: "Each Main App URL must use HTTP or HTTPS." }, { status: 400 })
    }
  }
  writeSettingsServer(body)
  return NextResponse.json({ success: true })
}
