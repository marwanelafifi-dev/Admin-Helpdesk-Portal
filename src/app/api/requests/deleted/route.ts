import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { deletedRequestStore } from "@/lib/deletedRequestStore"
import type { EngineRequest } from "@/services/engineService"

export const runtime = "nodejs"

/**
 * GET /api/requests/deleted
 * Returns all soft-deleted requests (recycle bin).
 * Auth-gated: any signed-in user can read.
 */
export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return NextResponse.json({ data: deletedRequestStore.getAll() })
}

/**
 * POST /api/requests/deleted
 * Saves a deleted request into the recycle bin.
 * Admin-only (Full Access / manage_users / * wildcard).
 * Body: { request: EngineRequest, deletedBy: string }
 */
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const perms = (session.user.permissions as string[] | undefined) ?? []
  const role = session.user.role
  const isAdmin = role === "Full Access" || perms.includes("*") || perms.includes("manage_users")
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = (await req.json()) as { request?: EngineRequest; deletedBy?: string }
  if (!body?.request || !body.request.id) {
    return NextResponse.json({ error: "Missing request payload" }, { status: 400 })
  }

  const deletedBy = body.deletedBy ?? session.user.name ?? session.user.email ?? "Admin"
  deletedRequestStore.save(body.request, deletedBy)

  return NextResponse.json({ success: true })
}

/**
 * DELETE /api/requests/deleted?id=XYZ
 * Purges one entry from the recycle bin (NOT restoring — just permanent purge).
 * No id param → purge all.
 * Admin-only.
 */
export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const perms = (session.user.permissions as string[] | undefined) ?? []
  const role = session.user.role
  const isAdmin = role === "Full Access" || perms.includes("*") || perms.includes("manage_users")
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const url = new URL(req.url)
  const id = url.searchParams.get("id")

  if (!id) {
    deletedRequestStore.clear()
    return NextResponse.json({ success: true, cleared: "all" })
  }

  const removed = deletedRequestStore.remove(id)
  return NextResponse.json({ success: removed })
}
