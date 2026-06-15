import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { isSuperAdmin, hasPermission } from "@/lib/access"
import {
  readMaintenanceState,
  writeMaintenanceState,
  bumpSessionMinVersion,
} from "@/lib/maintenanceMode"

export const runtime = "nodejs"

/**
 * GET /api/admin/maintenance — returns the current maintenance flag,
 * banner message, and session min-version. Any signed-in user can read so
 * the Shell can decide whether to show the banner.
 *
 * PUT /api/admin/maintenance — toggle maintenance / change message.
 *   body: { maintenance?: boolean; maintenanceMessage?: string }
 *   admin-only.
 *
 * POST /api/admin/maintenance/force-signout — bumps sessionMinVersion to
 * the current time, invalidating every existing JWT on its next request.
 * Sent as a POST with no body. Admin-only.
 */

function isAuthorized(perms: string[] | undefined, role?: string) {
  if (isSuperAdmin(role)) return true
  if (!perms) return false
  return perms.includes("*")
    || hasPermission(perms, "manage_users")
    || hasPermission(perms, "settings")
    || hasPermission(perms, "page:admin-database")
    || hasPermission(perms, "page:admin-settings")
}

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return NextResponse.json(readMaintenanceState())
}

export async function PUT(req: Request) {
  const session = await auth()
  const perms = (session?.user?.permissions as string[] | undefined) ?? []
  if (!isAuthorized(perms, session?.user?.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  let body: { maintenance?: boolean; maintenanceMessage?: string } = {}
  try { body = await req.json() } catch {}
  const updated = writeMaintenanceState(body)
  return NextResponse.json(updated)
}

export async function POST() {
  // /api/admin/maintenance with POST = force sign-out everyone.
  const session = await auth()
  const perms = (session?.user?.permissions as string[] | undefined) ?? []
  if (!isAuthorized(perms, session?.user?.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const updated = bumpSessionMinVersion()
  return NextResponse.json({ ok: true, sessionMinVersion: updated.sessionMinVersion })
}
