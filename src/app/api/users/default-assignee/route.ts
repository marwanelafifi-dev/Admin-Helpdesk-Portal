import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { canManageUsers } from "@/lib/access"
import { getDefaultAssignee, setDefaultAssignee, findUserById } from "@/lib/userStore"

export const runtime = "nodejs"

/**
 * GET /api/users/default-assignee
 * Returns the user currently marked as the default assignee for new
 * requests, or null if none is set. Any signed-in user can read so that
 * the form submit handlers can fetch it without elevated permissions.
 */
export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const user = getDefaultAssignee()
  if (!user) {
    return NextResponse.json({ data: null })
  }
  return NextResponse.json({ data: { id: user.id, name: user.name, email: user.email, role: user.role } })
}

/**
 * POST /api/users/default-assignee
 * Body: { userId: string | null }
 * Sets the given user as the sole default assignee, clearing the flag from
 * every other user. Pass userId = null to clear the default entirely.
 * Requires manage_users (admin only).
 */
export async function POST(req: Request) {
  const session = await auth()
  if (!canManageUsers(session?.user?.role, session?.user?.permissions ?? [])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: { userId?: string | null } = {}
  try { body = await req.json() } catch { /* ignore */ }
  const userId = body.userId ?? null

  if (userId) {
    const target = findUserById(userId)
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    if (target.role !== "Administration Team") {
      return NextResponse.json(
        { error: "Only Administration Team members can be set as the default assignee" },
        { status: 400 }
      )
    }
  }

  const updated = setDefaultAssignee(userId)
  return NextResponse.json({ data: updated ? { id: updated.id, name: updated.name, email: updated.email } : null })
}
