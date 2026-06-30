/**
 * GET /api/requests/[id]/attachments
 * Returns all server-stored attachment metadata for a request.
 * Used by the request detail page to show disk-based attachments
 * alongside any legacy base64 attachments in the payload.
 */

import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { attachmentStore } from "@/lib/attachmentStore"

export const runtime = "nodejs"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const attachments = attachmentStore.getByRequestId(id)

  return NextResponse.json({
    data: attachments.map((att) => ({
      id: att.id,
      name: att.fileName,
      url: `/api/requests/${id}/attachments/${att.id}/download`,
      mimeType: att.mimeType,
      sizeBytes: att.sizeBytes,
      uploadedAt: att.uploadedAt,
      uploadedBy: att.uploadedBy,
      source: "server",
    })),
  })
}
