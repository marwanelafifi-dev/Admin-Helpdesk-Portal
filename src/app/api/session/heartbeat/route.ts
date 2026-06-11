import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { sessionStore } from "@/lib/sessionStore"

export const runtime = "nodejs"

/** POST /api/session/heartbeat — called every 60s by the Shell while user is signed in */
export async function POST() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 })

  const userId = session.user.id ?? session.user.email ?? "unknown"
  const email = session.user.email ?? ""
  const name = session.user.name ?? email

  sessionStore.upsert(userId, email, name)
  return NextResponse.json({ ok: true })
}

/** GET /api/session/heartbeat — returns currently online users (admin only) */
export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const perms = (session.user.permissions as string[] | undefined) ?? []
  const role = session.user.role as string | undefined
  const isAdmin = role === "Full Access" || perms.includes("*") || perms.includes("manage_users")
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  return NextResponse.json({ online: sessionStore.getOnline() })
}
