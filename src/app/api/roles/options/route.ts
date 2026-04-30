import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { canManageUsers } from "@/lib/access"
import { getAssignableRoles } from "@/lib/userRoles"

export async function GET() {
  const session = await auth()

  if (!canManageUsers(session?.user?.role, session?.user?.permissions ?? [])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const roles = await getAssignableRoles()
  return NextResponse.json({ roles })
}
