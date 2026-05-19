import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { readUsers } from "@/lib/userStore"

export const runtime = "nodejs"

// Lightweight user directory for CC pickers, assignee dropdowns, etc.
// Returns just enough to render a chip (name + email + avatar).
// Any signed-in user can read this — no manage_users permission required.
export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ data: [] }, { status: 401 })
  }

  const users = readUsers()
    .filter((u) => u.active !== false)
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      image: u.image ?? null,
      role: u.role,
    }))
    // Stable sort by display name
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))

  return NextResponse.json({ data: users })
}
