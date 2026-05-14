import { NextResponse } from "next/server"
import { readUsers } from "@/lib/userStore"
import rolesJson from "@/../data/roles.json"

export const runtime = "nodejs"

// Returns all users whose role has manage_users or page:tasks (administration team + full access)
export async function GET() {
  try {
    const roles = rolesJson as Array<{ id: string; name: string; permissions: string[] }>
    const adminRoleNames = new Set(
      roles
        .filter((r) => r.permissions.includes("manage_users") || r.permissions.includes("page:all-requests"))
        .map((r) => r.name)
    )

    const users = readUsers()
      .filter((u) => u.active && adminRoleNames.has(u.role))
      .map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role }))

    return NextResponse.json({ data: users })
  } catch {
    return NextResponse.json({ data: [] })
  }
}
