import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { attachmentStore } from "@/lib/attachmentStore"
import { downloadFile } from "@/lib/fileStorage"

export const runtime = "nodejs"

/**
 * GET /api/requests/:id/attachments/:index/download
 *
 * Forces a file download (Content-Disposition: attachment).
 * Used for the Download button on the attachments tab.
 * Serves the file from server disk via the attachmentStore metadata.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; index: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id, index } = await params

  const serverAtt = attachmentStore.getById(index)
  if (!serverAtt || serverAtt.requestId !== id) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 })
  }

  try {
    const buffer = downloadFile(serverAtt.filePath)
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": serverAtt.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(serverAtt.fileName)}"`,
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch {
    return NextResponse.json({ error: "File not found on disk" }, { status: 404 })
  }
}
