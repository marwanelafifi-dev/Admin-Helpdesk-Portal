import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { canManageUsers } from "@/lib/access"
import { readRoles } from "@/lib/rolesStore"

export async function GET() {
  const session = await auth()
  if (!canManageUsers(session?.user?.role, session?.user?.permissions ?? [])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const roles = readRoles().map((r) => ({
    value: r.name,
    label: r.name.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
    description: r.description,
  }))

  return NextResponse.json({ roles })
}
