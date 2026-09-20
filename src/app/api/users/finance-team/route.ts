import { NextResponse } from "next/server"
import { readUsers } from "@/lib/userStore"
import { roleToFunctionId } from "@/lib/functionRegistry"

export const runtime = "nodejs"

// Returns only Finance Team users — the assignable pool for Finance-owned
// requests, once a Finance module exists. Mirrors /api/users/admin-team.
export async function GET() {
  try {
    const users = readUsers()
      .filter((u) => u.active && roleToFunctionId(u.role) === "finance")
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
