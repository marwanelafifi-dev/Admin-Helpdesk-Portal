import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { canManageIntranetContent } from "@/lib/functionRegistry"
import { uploadFile } from "@/lib/fileStorage"
import { createIntranetDocument, getAllIntranetDocuments } from "@/lib/intranetDocumentsStore"
import type { IntranetOwner } from "@/lib/quickLinksStore"

export const runtime = "nodejs"

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25 MB
const VALID_OWNERS: IntranetOwner[] = ["company", "admin", "hr", "finance"]

/** GET /api/intranet-documents — any signed-in user, metadata only (read is company-wide). */
export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return NextResponse.json({ data: getAllIntranetDocuments() })
}

/** POST /api/intranet-documents — upload a document. Only the owning team (or Full Access) may upload it. */
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get("file") as File | null
  const title = formData.get("title")
  const description = formData.get("description")
  const ownerRaw = formData.get("owner")

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }
  if (typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 })
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024} MB limit` }, { status: 413 })
  }

  const owner: IntranetOwner = VALID_OWNERS.includes(ownerRaw as IntranetOwner) ? (ownerRaw as IntranetOwner) : "company"
  if (!canManageIntranetContent(owner, session.user.role, (session.user as any).intranetOwners)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const docId = `intranet-doc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const buffer = await file.arrayBuffer()
  const stored = await uploadFile(docId, file.name, Buffer.from(buffer))

  const doc = createIntranetDocument({
    title: title.trim(),
    description: typeof description === "string" ? description.trim() || undefined : undefined,
    owner,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    filePath: stored.filePath,
    checksum: stored.checksum,
    uploadedBy: session.user.name || session.user.email || "Unknown",
    uploadedByEmail: session.user.email || "",
  })

  return NextResponse.json({ data: doc }, { status: 201 })
}
