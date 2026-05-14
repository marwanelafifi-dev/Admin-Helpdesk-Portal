import { NextResponse } from "next/server"
import { readUsers } from "@/lib/userStore"

export const runtime = "nodejs"

// Returns only users with the "Administration Team" role
export async function GET() {
  try {
    const adminRoleNames = new Set(["Administration Team", "Full Access"])

    const users = readUsers()
      .filter((u) => u.active && adminRoleNames.has(u.role))
      .map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role }))

    return NextResponse.json({ data: users })
  } catch {
    return NextResponse.json({ data: [] })
  }
}
