import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getServerAuditLog, verifyServerAuditLog } from "@/lib/serverAuditLog"

export const runtime = "nodejs"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const perms = (session.user.permissions as string[] | undefined) ?? []
  const role = session.user.role as string | undefined
  const isAdmin = role === "Full Access" || perms.includes("*") || perms.includes("manage_users") || perms.includes("page:admin-audit")
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const data = getServerAuditLog()
  return NextResponse.json({ data, integrity: verifyServerAuditLog(data) })
}
