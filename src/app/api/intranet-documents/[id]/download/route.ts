import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getIntranetDocumentById } from "@/lib/intranetDocumentsStore"
import { downloadFile } from "@/lib/fileStorage"

export const runtime = "nodejs"

/**
 * GET /api/intranet-documents/:id/download
 * Forces a file download (Content-Disposition: attachment). Read is
 * company-wide — any signed-in user may download any document.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const doc = getIntranetDocumentById(id)
  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 })
  }

  try {
    const buffer = downloadFile(doc.filePath)
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": doc.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(doc.fileName)}"`,
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch {
    return NextResponse.json({ error: "File not found on disk" }, { status: 404 })
  }
}
