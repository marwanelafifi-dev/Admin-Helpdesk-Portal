import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { readEmailConfig, writeEmailConfig } from "@/lib/emailConfig"

export const runtime = "nodejs"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const config = readEmailConfig()
  return NextResponse.json({ config })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { config } = await req.json()
  if (!config?.method || !config?.values) {
    return NextResponse.json({ error: "Invalid config" }, { status: 400 })
  }
  writeEmailConfig(config)
  return NextResponse.json({ ok: true })
}
