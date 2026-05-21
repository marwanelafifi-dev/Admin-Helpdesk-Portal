import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { requestStore } from "@/lib/requestStore"
import { getDefaultAssignee } from "@/lib/userStore"
import type { EngineRequest } from "@/services/engineService"

export const runtime = "nodejs"

/**
 * GET /api/requests
 * Returns every request in the shared server store. Used by every list page
 * (My Requests, All Requests, module pages) so users see each others' work.
 * Auth-gated: any signed-in user can read. Client-side filters control what
 * actually renders (e.g. My Requests still filters to current user).
 */
export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return NextResponse.json({ data: requestStore.getAll() })
}

/**
 * POST /api/requests
 * Upsert a full request object. Used by engineService when the user submits
 * a new request or updates an existing one. The client constructs the full
 * EngineRequest object (id, timestamps, etc.); the server just persists it.
 */
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await req.json()) as { request?: EngineRequest }
  if (!body?.request || !body.request.id) {
    return NextResponse.json({ error: "Missing request payload" }, { status: 400 })
  }

  const incoming = body.request

  // Auto-assign: if this is a brand-new request (no existing record with the
  // same id) and the incoming payload doesn't already specify an assignee,
  // stamp on the currently-configured default assignee (if one exists).
  let assignee = {
    assignedToId: incoming.assignedToId ?? null,
    assignedToName: incoming.assignedToName ?? null,
    assignedToEmail: incoming.assignedToEmail ?? null,
  }
  const isNew = !requestStore.getAll().some((r) => r.id === incoming.id)
  if (isNew && !assignee.assignedToId) {
    const defaultAssignee = getDefaultAssignee()
    if (defaultAssignee) {
      assignee = {
        assignedToId: defaultAssignee.id,
        assignedToName: defaultAssignee.name,
        assignedToEmail: defaultAssignee.email,
      }
    }
  }

  const saved = requestStore.upsert({
    ...incoming,
    ...assignee,
    updatedAt: new Date().toISOString(),
  })

  return NextResponse.json({ request: saved })
}

/**
 * DELETE /api/requests?id=XYZ
 * Removes a single request. Currently unused by the UI but exposed for the
 * Database admin page's Clear flow.
 */
export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Permanent-delete is admin-only. Requires Full Access OR manage_users
  // OR the `*` wildcard — same gate as the rest of the user-management API.
  const perms = (session.user.permissions as string[] | undefined) ?? []
  const role = session.user.role
  const isAdmin = role === "Full Access" || perms.includes("*") || perms.includes("manage_users")
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const url = new URL(req.url)
  const id = url.searchParams.get("id")
  const moduleId = url.searchParams.get("module")

  // ?module=foo — wipe every request in that module (used by the per-module
  // Clear buttons on Admin → Database).
  if (moduleId) {
    const all = requestStore.getAll()
    const remaining = all.filter((r) => r.module !== moduleId)
    requestStore.bulkReplace(remaining)
    return NextResponse.json({ success: true, removed: all.length - remaining.length })
  }

  // No id and no module — wipe everything.
  if (!id) {
    requestStore.clear()
    return NextResponse.json({ success: true, cleared: "all" })
  }

  // Single-id permanent delete.
  const removed = requestStore.remove(id)
  return NextResponse.json({ success: removed })
}
