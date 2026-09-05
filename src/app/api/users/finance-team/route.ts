import { NextResponse } from "next/server"
import { readUsers } from "@/lib/userStore"

export const runtime = "nodejs"

// Returns only Finance Team users — the assignable pool for Finance-owned
// requests, once a Finance module exists. Mirrors /api/users/admin-team.
export async function GET() {
  try {
    const financeRoleNames = new Set(["Finance Team"])

    const users = readUsers()
      .filter((u) => u.active && financeRoleNames.has(u.role))
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        image: u.image ?? null,
        role: u.role,
        defaultAssignee: u.defaultAssignee ?? false,
      }))

    return NextResponse.json({ data: users })
  } catch {
    return NextResponse.json({ data: [] })
  }
}
