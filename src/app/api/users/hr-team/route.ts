import { NextResponse } from "next/server"
import { readUsers } from "@/lib/userStore"

export const runtime = "nodejs"

// Returns only People Team users — the assignable pool for HR-owned requests
// (module "hr" and "hr_general"). Mirrors /api/users/admin-team.
export async function GET() {
  try {
    const hrRoleNames = new Set(["People Team"])

    const users = readUsers()
      .filter((u) => u.active && hrRoleNames.has(u.role))
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
