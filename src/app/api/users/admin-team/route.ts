import { NextResponse } from "next/server"
import { readUsers } from "@/lib/userStore"

export const runtime = "nodejs"

// Returns only Administration Team users. These are the people who get
// notified by email when a new request is submitted. Full Access is
// deliberately excluded — it's a super-admin role, not a working queue.
export async function GET() {
  try {
    const adminRoleNames = new Set(["Administration Team"])

    const users = readUsers()
      .filter((u) => u.active && adminRoleNames.has(u.role))
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
