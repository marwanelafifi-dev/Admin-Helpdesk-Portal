import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { requestStore } from "@/lib/requestStore"
import { deletedRequestStore } from "@/lib/deletedRequestStore"

export const runtime = "nodejs"

/**
 * POST /api/requests/restore
 * Restores a soft-deleted request back into the live request store.
 * Admin-only (Full Access / manage_users / * wildcard).
 * Body: { id: string }
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

  const body = (await req.json()) as { id?: string }
  if (!body?.id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 })
  }

  const all = deletedRequestStore.getAll()
  const entry = all.find((d) => d.request.id === body.id)

  if (!entry) {
    return NextResponse.json({ error: "Deleted request not found" }, { status: 404 })
  }

  // Restore with a fresh updatedAt so list pages sort it to the top.
  const restored = requestStore.upsert({
    ...entry.request,
    updatedAt: new Date().toISOString(),
  })

  // Remove from the recycle bin.
  deletedRequestStore.remove(body.id)

  return NextResponse.json({ request: restored })
}
