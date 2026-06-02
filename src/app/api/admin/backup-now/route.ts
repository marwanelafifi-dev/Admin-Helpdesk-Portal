import { NextRequest, NextResponse } from "next/server"
import { getToken } from "@auth/core/jwt"
import { runBackup } from "@/lib/backupRunner"
import { listBackupFiles } from "@/lib/backupScheduleStore"

export const runtime = "nodejs"
export const maxDuration = 30

function isAdmin(token: any): boolean {
  const perms: string[] = token?.permissions ?? []
  return perms.includes("*") || perms.includes("page:admin-database") || perms.includes("manage_users")
}

export async function POST(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    secureCookie: req.nextUrl.protocol === "https:",
  })
  if (!token || !isAdmin(token)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const result = await runBackup()
    const files = listBackupFiles()
    return NextResponse.json({ success: true, ...result, files })
  } catch (e: any) {
    console.error("[backup-now] Failed:", e?.message)
    return NextResponse.json({ error: e?.message ?? "Backup failed" }, { status: 500 })
  }
}
