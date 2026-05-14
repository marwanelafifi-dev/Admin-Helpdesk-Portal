import { NextResponse } from "next/server"
import { readUsers } from "@/lib/userStore"
import rolesJson from "@/../data/roles.json"

export const runtime = "nodejs"

export async function GET() {
  try {
    const roles = rolesJson as Array<{ id: string; name: string; permissions: string[] }>

    // Roles that have page:tasks access
    const taskRoleNames = new Set(
      roles
        .filter((r) => r.permissions.includes("page:tasks"))
        .map((r) => r.name)
    )

    const users = readUsers()
      .filter((u) => u.active && taskRoleNames.has(u.role))
      .map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role }))

    return NextResponse.json({ data: users })
  } catch (error) {
    console.error("[assignable-users]", error)
    return NextResponse.json({ data: [] })
  }
}
