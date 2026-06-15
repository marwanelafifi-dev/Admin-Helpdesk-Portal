import { NextRequest, NextResponse } from "next/server"
import { getToken } from "@auth/core/jwt"
import { readSchedule, writeSchedule, listBackupFiles } from "@/lib/backupScheduleStore"

export const runtime = "nodejs"

function isAdmin(token: any): boolean {
  const perms: string[] = token?.permissions ?? []
  return perms.includes("*") || perms.includes("page:admin-database") || perms.includes("manage_users")
}

export async function GET(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    secureCookie: req.nextUrl.protocol === "https:",
  })
  if (!token || !isAdmin(token)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const schedule = readSchedule()
  const files = listBackupFiles()
  return NextResponse.json({ schedule, files })
}

export async function POST(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    secureCookie: req.nextUrl.protocol === "https:",
  })
  if (!token || !isAdmin(token)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const updated = writeSchedule(body)
  return NextResponse.json({ success: true, schedule: updated })
}
