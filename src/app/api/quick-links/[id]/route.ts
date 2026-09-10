import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { canManageIntranetContent } from "@/lib/functionRegistry"
import { deleteQuickLink, getQuickLinkById, updateQuickLink } from "@/lib/quickLinksStore"

export const runtime = "nodejs"

/** PATCH /api/quick-links/:id — only the owning team (or Full Access) may edit it. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const existing = getQuickLinkById(id)
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  if (!canManageIntranetContent(existing.owner, session.user.role, (session.user as any).intranetOwners)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  const updated = updateQuickLink(id, {
    title: typeof body.title === "string" ? body.title.trim() : undefined,
    description: typeof body.description === "string" ? body.description.trim() || undefined : undefined,
    url: typeof body.url === "string" ? body.url.trim() : undefined,
    icon: typeof body.icon === "string" ? body.icon : undefined,
  })

  return NextResponse.json({ data: updated })
}

/** DELETE /api/quick-links/:id — only the owning team (or Full Access) may delete it. */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const existing = getQuickLinkById(id)
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  if (!canManageIntranetContent(existing.owner, session.user.role, (session.user as any).intranetOwners)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  deleteQuickLink(id)
  return NextResponse.json({ success: true })
}
