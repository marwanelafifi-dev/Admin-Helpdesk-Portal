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
  writeSettingsServer(body)
  return NextResponse.json({ success: true })
}
