import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { requestStore } from "@/lib/requestStore"
import { commentsStore } from "@/lib/commentsStore"
import { attachmentStore } from "@/lib/attachmentStore"
import { downloadFile } from "@/lib/fileStorage"
import { deleteFile } from "@/lib/fileStorage"

export const runtime = "nodejs"

/**
 * GET /api/requests/:id/attachments/:index
 *
 * Serves an attachment for preview or download.
 * Handles both:
 * 1. Server-stored files (uploaded via the upload route) — served from disk
 * 2. Legacy base64 data: URLs — decoded and served inline
 *
 * The :index segment can be:
 *  - the attachment's `id` field (preferred)
 *  - a numeric index into the request's payload.attachments[] (legacy)
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

  // ── 1. Try server-stored attachment first (new system) ──────────────────────
  const serverAtt = attachmentStore.getById(index)
  if (serverAtt && serverAtt.requestId === id) {
    try {
      const buffer = downloadFile(serverAtt.filePath)
      const mime = serverAtt.mimeType || "application/octet-stream"
      const viewableTypes = ["image/", "application/pdf", "text/"]
      const isViewable = viewableTypes.some((t) => mime.startsWith(t))
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": mime,
          "Content-Disposition": `${isViewable ? "inline" : "attachment"}; filename="${encodeURIComponent(serverAtt.fileName)}"`,
          "Cache-Control": "private, max-age=3600",
        },
      })
    } catch {
      return NextResponse.json({ error: "File not found on disk" }, { status: 404 })
    }
  }

  // ── 2. Fall back to base64 data: URL in request payload (legacy) ────────────
  const request = requestStore.getAll().find((r) => r.id === id)
  if (!request) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 })
  }

  // Collect all attachments from payload (handles all module formats)
  const payloadAtts = collectPayloadAttachments(request.payload as any)

  // Also check comment attachments
  const commentAtts = commentsStore.getComments(id).flatMap((c) =>
    (c.attachments ?? []).map((a) => ({ id: a.id, url: a.url, name: a.name, mimeType: (a as any).mimeType }))
  )

  const allAtts = [...payloadAtts, ...commentAtts]

  // Match by id or numeric index
  let att: { url: string; name: string; mimeType?: string } | undefined
  const asNumber = Number(index)
  if (Number.isInteger(asNumber) && asNumber >= 0) {
    att = payloadAtts[asNumber]
  }
  if (!att) att = allAtts.find((a) => a.id === index)
  if (!att) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 })
  }

  if (typeof att.url !== "string") {
    return NextResponse.json({ error: "Invalid attachment" }, { status: 400 })
  }

  // Server URL stored as /api/... path — redirect to download route
  if (att.url.startsWith("/api/")) {
    return NextResponse.redirect(new URL(att.url, process.env.NEXTAUTH_URL || "http://localhost:3003"))
  }

  if (!att.url.startsWith("data:")) {
    return NextResponse.redirect(att.url)
  }

  const match = att.url.match(/^data:([^;,]+)?(?:;base64)?,(.*)$/)
  if (!match) {
    return NextResponse.json({ error: "Malformed data URL" }, { status: 400 })
  }
  const mime = att.mimeType || match[1] || "application/octet-stream"
  const isBase64 = att.url.includes(";base64,")
  const data = match[2] || ""

  let buffer: Buffer
  try {
    buffer = isBase64 ? Buffer.from(data, "base64") : Buffer.from(decodeURIComponent(data), "utf-8")
  } catch {
    return NextResponse.json({ error: "Failed to decode attachment" }, { status: 500 })
  }

  const viewableTypes = ["image/", "application/pdf", "text/"]
  const isViewable = viewableTypes.some((t) => mime.startsWith(t))

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `${isViewable ? "inline" : "attachment"}; filename="${encodeURIComponent(att.name || "attachment")}"`,
      "Cache-Control": "private, max-age=300",
    },
  })
}

/**
 * DELETE /api/requests/:id/attachments/:index
 * Delete attachment file and metadata (index = attachmentId)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; index: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, index } = await params

    const attachment = attachmentStore.getById(index)
    if (!attachment || attachment.requestId !== id) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 })
    }

    deleteFile(attachment.filePath)
    attachmentStore.delete(index)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Delete error:", err)
    return NextResponse.json({ error: "Failed to delete file" }, { status: 500 })
  }
}

/**
 * Collects all attachments from a request payload regardless of module format.
 * Different modules store attachments differently:
 * - Most modules: payload.attachments[]
 * - Travel: named fields (amanSticker, passport, hotelPhoto, flightPhoto) + additionalAttachments[]
 */
function collectPayloadAttachments(payload: any): Array<{ id?: string; url: string; name: string; mimeType?: string }> {
  if (!payload) return []
  const result: Array<{ id?: string; url: string; name: string; mimeType?: string }> = []

  if (Array.isArray(payload.attachments)) {
    result.push(...payload.attachments.filter(Boolean))
  }

  // Travel named fields
  for (const field of ["amanSticker", "passport", "hotelPhoto", "flightPhoto"]) {
    if (payload[field] && typeof payload[field] === "object" && payload[field].url) {
      result.push(payload[field])
    }
  }

  if (Array.isArray(payload.additionalAttachments)) {
    result.push(...payload.additionalAttachments.filter(Boolean))
  }

  return result
}
