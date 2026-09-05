import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { readEmailConfig, writeEmailConfig, type EmailFunctionId } from "@/lib/emailConfig"

export const runtime = "nodejs"

const VALID_FUNCTIONS: EmailFunctionId[] = ["admin", "hr", "finance"]

function parseFunctionId(value: string | null): EmailFunctionId {
  return VALID_FUNCTIONS.includes(value as EmailFunctionId) ? (value as EmailFunctionId) : "admin"
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const functionId = parseFunctionId(req.nextUrl.searchParams.get("functionId"))
  const config = readEmailConfig(functionId)
  return NextResponse.json({ config })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { config, functionId: rawFunctionId } = await req.json()
  if (!config?.method || !config?.values) {
    return NextResponse.json({ error: "Invalid config" }, { status: 400 })
  }
  const functionId = parseFunctionId(rawFunctionId ?? null)
  writeEmailConfig(functionId, config)
  return NextResponse.json({ ok: true })
}
