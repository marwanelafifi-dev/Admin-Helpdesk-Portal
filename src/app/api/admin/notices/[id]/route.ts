import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { isSuperAdmin, hasPermission } from "@/lib/access"
import { updateNotice, deleteNotice } from "@/lib/noticeStore"

export const runtime = "nodejs"

function isAuthorized(perms: string[] | undefined, role?: string): boolean {
  if (isSuperAdmin(role)) return true
  if (!perms) return false
  return (
    perms.includes("*") ||
    hasPermission(perms, "manage_users") ||
    hasPermission(perms, "settings")
  )
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  const perms = (session?.user?.permissions as string[] | undefined) ?? []

  if (!isAuthorized(perms, session?.user?.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { id } = params
    const body = await req.json()

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Missing or invalid id" }, { status: 400 })
    }

    // Trim lengths if provided
    if (body.title) body.title = body.title.slice(0, 100)
    if (body.summary) body.summary = body.summary.slice(0, 200)
    if (body.description) body.description = body.description.slice(0, 5000)

    const updated = updateNotice(id, body)
    if (!updated) {
      return NextResponse.json({ error: "Notice not found" }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Failed to update notice:", error)
    return NextResponse.json({ error: "Failed to update notice" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  const perms = (session?.user?.permissions as string[] | undefined) ?? []

  if (!isAuthorized(perms, session?.user?.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { id } = params

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Missing or invalid id" }, { status: 400 })
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
