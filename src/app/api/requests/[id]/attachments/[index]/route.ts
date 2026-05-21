import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { requestStore } from "@/lib/requestStore"
import { commentsStore } from "@/lib/commentsStore"

export const runtime = "nodejs"

/**
 * GET /api/requests/:id/attachments/:index
 *
 * Returns the raw bytes of an attachment so the browser can preview it
 * inline when opened in a new tab. Chrome blocks top-level navigation to
 * `data:` URLs as a phishing protection, so we decode the data URL
 * server-side and serve it with the correct Content-Type.
 *
 * The `:index` segment can be:
 *  - a numeric index into the request's payload.attachments[] (legacy)
 *  - the attachment's own `id` field — works for BOTH request-level
 *    attachments and comment-level attachments. This is the form the
 *    detail page uses today because the visible attachments list mixes
 *    both sources.
 *
 * Auth-gated to any signed-in user.
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
  const requests = requestStore.getAll()
  const request = requests.find((r) => r.id === id)
  if (!request) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 })
  }

  const payloadAttachments = ((request.payload as any)?.attachments ?? []) as Array<{
    id?: string; url: string; name: string; mimeType?: string
  }>
  const commentAttachments = commentsStore.getComments(id).flatMap((c) =>
    (c.attachments ?? []).map((a) => ({ id: a.id, url: a.url, name: a.name, mimeType: (a as any).mimeType }))
  )

  // Try numeric index first (back-compat), then match by id across both
  // payload and comment attachments.
  let att: { url: string; name: string; mimeType?: string } | undefined
  const asNumber = Number(index)
  if (Number.isInteger(asNumber) && asNumber >= 0 && payloadAttachments[asNumber]) {
    att = payloadAttachments[asNumber]
  }
  if (!att) {
    att = payloadAttachments.find((a) => a.id === index)
  }
  if (!att) {
    att = commentAttachments.find((a) => a.id === index)
  }
  if (!att) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 })
  }

  if (typeof att.url !== "string") {
    return NextResponse.json({ error: "Invalid attachment" }, { status: 400 })
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

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `inline; filename="${encodeURIComponent(att.name || "attachment")}"`,
      "Cache-Control": "private, max-age=300",
    },
  })
}
