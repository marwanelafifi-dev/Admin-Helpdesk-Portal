import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { commentsStore } from "@/lib/commentsStore"
import { canAccessRequest } from "@/lib/requestAccess"

export const runtime = "nodejs"

/** Opens a file that was attached to a comment, after the normal portal access check. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> },
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: requestId, attachmentId } = await params
  if (!canAccessRequest(session.user, requestId)) {
    return NextResponse.json({ error: "Access restricted" }, { status: 403 })
  }

  const attachment = commentsStore
    .getComments(requestId)
    .flatMap((comment) => comment.attachments ?? [])
    .find((item) => item.id === attachmentId)
  if (!attachment) return NextResponse.json({ error: "Attachment not found" }, { status: 404 })

  const match = attachment.url.match(/^data:([^;,]+)?;base64,([A-Za-z0-9+/=\s]+)$/)
  if (!match) return NextResponse.json({ error: "Attachment is unavailable" }, { status: 404 })

  const fileName = attachment.name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").slice(0, 160) || "comment-attachment"
  const bytes = Buffer.from(match[2].replace(/\s/g, ""), "base64")
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": match[1] || "application/octet-stream",
      "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}"`,
      "Cache-Control": "private, max-age=300",
    },
  })
}
