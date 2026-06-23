import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { isSuperAdmin, hasPermission } from "@/lib/access"
import {
  createNotice,
  updateNotice,
  deleteNotice,
  getAllNotices,
  type SystemNotice,
} from "@/lib/noticeStore"

export const runtime = "nodejs"

/**
 * GET /api/admin/notices — returns all system notices (admin info only).
 * Requires Full Access or manage_users permission.
 *
 * POST /api/admin/notices — creates a new notice.
 *   body: { title, type, summary, description?, postedBy? }
 *
 * PUT /api/admin/notices/:id — updates a notice.
 *   body: partial SystemNotice object
 *
 * DELETE /api/admin/notices/:id — deletes a notice.
 */

function isAuthorized(perms: string[] | undefined, role?: string): boolean {
  if (isSuperAdmin(role)) return true
  if (!perms) return false
  return (
    perms.includes("*") ||
    hasPermission(perms, "manage_users") ||
    hasPermission(perms, "settings")
  )
}

export async function GET() {
  const session = await auth()
  const perms = (session?.user?.permissions as string[] | undefined) ?? []

  if (!isAuthorized(perms, session?.user?.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const notices = getAllNotices()
    return NextResponse.json({ data: notices })
  } catch (error) {
    console.error("Failed to read notices:", error)
    return NextResponse.json({ error: "Failed to read notices" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  const perms = (session?.user?.permissions as string[] | undefined) ?? []

  if (!isAuthorized(perms, session?.user?.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await req.json()

    // Validation
    if (!body.title || typeof body.title !== "string") {
      return NextResponse.json({ error: "Missing or invalid title" }, { status: 400 })
    }
    if (!body.summary || typeof body.summary !== "string") {
      return NextResponse.json({ error: "Missing or invalid summary" }, { status: 400 })
    }
    if (!body.type || !["feature", "bug_fix", "update"].includes(body.type)) {
      return NextResponse.json({ error: "Invalid notice type" }, { status: 400 })
    }

    // Trim lengths
    const title = body.title.slice(0, 100)
    const summary = body.summary.slice(0, 200)
    const description = body.description ? body.description.slice(0, 5000) : undefined

    const notice = createNotice({
      title,
      type: body.type,
      summary,
      description,
      postedAt: body.postedAt ?? new Date().toISOString(),
      postedBy: session?.user?.email ?? "System",
    })

    return NextResponse.json(notice, { status: 201 })
  } catch (error) {
    console.error("Failed to create notice:", error)
    return NextResponse.json({ error: "Failed to create notice" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  const session = await auth()
  const perms = (session?.user?.permissions as string[] | undefined) ?? []

  if (!isAuthorized(perms, session?.user?.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { id, ...updates } = body

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Missing or invalid id" }, { status: 400 })
    }

    // Trim lengths if provided
    if (updates.title) updates.title = updates.title.slice(0, 100)
    if (updates.summary) updates.summary = updates.summary.slice(0, 200)
    if (updates.description) updates.description = updates.description.slice(0, 5000)

    const updated = updateNotice(id, updates)
    if (!updated) {
      return NextResponse.json({ error: "Notice not found" }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Failed to update notice:", error)
    return NextResponse.json({ error: "Failed to update notice" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const session = await auth()
  const perms = (session?.user?.permissions as string[] | undefined) ?? []

  if (!isAuthorized(perms, session?.user?.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const url = new URL(req.url)
    const id = url.searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 })
    }

    const deleted = deleteNotice(id)
    if (!deleted) {
      return NextResponse.json({ error: "Notice not found" }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Failed to delete notice:", error)
    return NextResponse.json({ error: "Failed to delete notice" }, { status: 500 })
  }
}
