import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { canManageIntranetContent } from "@/lib/functionRegistry"
import { deleteFile } from "@/lib/fileStorage"
import { deleteIntranetDocument, getIntranetDocumentById, updateIntranetDocument } from "@/lib/intranetDocumentsStore"

export const runtime = "nodejs"

/** PATCH /api/intranet-documents/:id — title/description only. Only the owning team (or Full Access) may edit it. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const existing = getIntranetDocumentById(id)
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

  const updated = updateIntranetDocument(id, {
    title: typeof body.title === "string" ? body.title.trim() : undefined,
    description: typeof body.description === "string" ? body.description.trim() || undefined : undefined,
  })

  return NextResponse.json({ data: updated })
}

/** DELETE /api/intranet-documents/:id — only the owning team (or Full Access) may delete it. */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const existing = getIntranetDocumentById(id)
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  if (!canManageIntranetContent(existing.owner, session.user.role, (session.user as any).intranetOwners)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    deleteFile(existing.filePath)
  } catch {
    // File already missing on disk — still remove the metadata record below.
  }
  deleteIntranetDocument(id)

  return NextResponse.json({ success: true })
}
