import { NextRequest, NextResponse } from "next/server"
import { sendRequestUpdateEmail } from "@/lib/emailService"
import { auth } from "@/auth"
import { requestStore } from "@/lib/requestStore"
import { hasRecordedApproval } from "@/lib/approvalRules"
import { commentsStore } from "@/lib/commentsStore"

type RequestUpdatePayload = {
  to?: string[]
  cc?: string[]
  updateType?: "status" | "comment" | "request_updated"
  requestId?: string
  requestTitle?: string
  module?: string
  actorName?: string
  preview?: string
  previousStatus?: string
  newStatus?: string
  commentAttachments?: Array<{
    id?: string
    name?: string
    sizeBytes?: number
  }>
}

const MAX_COMMENT_EMAIL_ATTACHMENT_BYTES = 10 * 1024 * 1024
const MAX_COMMENT_EMAIL_TOTAL_BYTES = 20 * 1024 * 1024

function decodeCommentEmailAttachments(
  requestId: string,
  baseUrl: string,
  value: RequestUpdatePayload["commentAttachments"],
) {
  if (!Array.isArray(value)) return []

  let totalBytes = 0
  const attachments: Array<{ filename: string; content: Buffer; contentType: string; portalUrl?: string }> = []
  const storedAttachments = commentsStore
    .getComments(requestId)
    .flatMap((comment) => comment.attachments ?? [])

  for (const item of value) {
    if (!item?.id) continue
    const stored = storedAttachments.find((attachment) => attachment.id === item.id)
    if (!stored) continue
    const match = stored.url.match(/^data:([^;,]+)?;base64,([A-Za-z0-9+/=\s]+)$/)
    if (!match) continue

    const content = Buffer.from(match[2].replace(/\s/g, ""), "base64")
    if (!content.length || content.length > MAX_COMMENT_EMAIL_ATTACHMENT_BYTES) continue
    totalBytes += content.length
    if (totalBytes > MAX_COMMENT_EMAIL_TOTAL_BYTES) break

    attachments.push({
      filename: stored.name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").slice(0, 160) || "comment-attachment",
      content,
      contentType: match[1] || "application/octet-stream",
      portalUrl: item.id
        ? `${baseUrl}/api/requests/${encodeURIComponent(requestId)}/comments/attachments/${encodeURIComponent(item.id)}/open`
        : undefined,
    })
  }
  return attachments
}

export async function POST(req: NextRequest) {
  // Called from the signed-in browser when request activity occurs.
  // A session is required to prevent unauthenticated SMTP abuse.
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = (await req.json()) as RequestUpdatePayload

    if (!body.requestId || !body.requestTitle || !body.module || !body.updateType) {
      return NextResponse.json(
        { error: "requestId, requestTitle, module, and updateType are required" },
        { status: 400 }
      )
    }

    // Final server-side protection for old browser bundles and retry queues:
    // an approved request must never send a new "Awaiting Approval" status
    // email, even if a stale client tries to submit one after its status
    // update was rejected.
    if (body.updateType === "status" && body.newStatus === "awaiting_approval") {
      const liveRequest = requestStore.getAll().find((request) => request.id === body.requestId)
      if (liveRequest && hasRecordedApproval(liveRequest)) {
        console.warn("[email] Blocked stale Awaiting Approval notification for approved request", {
          requestId: body.requestId,
        })
        return NextResponse.json({
          data: {
            sent: false,
            reason: "This request has already been approved and cannot return to Awaiting Approval.",
          },
        })
      }
    }

    const recipients = Array.isArray(body.to) ? body.to.filter(Boolean) : []
    if (recipients.length === 0) {
      console.warn("[email] No recipients provided for notification", {
        requestId: body.requestId,
        updateType: body.updateType,
      })
      return NextResponse.json({ data: { sent: false, reason: "No recipients" } })
    }

    console.info("[email] Sending request update notification", {
      requestId: body.requestId,
      updateType: body.updateType,
      recipientCount: recipients.length,
    })

    const commentAttachments = body.updateType === "comment"
      ? decodeCommentEmailAttachments(body.requestId, new URL(req.url).origin, body.commentAttachments)
      : []

    await sendRequestUpdateEmail({
      to: recipients,
      cc: Array.isArray(body.cc) ? body.cc.filter(Boolean) : undefined,
      updateType: body.updateType,
      requestId: body.requestId,
      requestTitle: body.requestTitle,
      module: body.module,
      actorName: body.actorName,
      preview: body.preview,
      previousStatus: body.previousStatus,
      newStatus: body.newStatus,
      commentAttachments,
    })

    console.info("[email] Successfully sent request update notification", {
      requestId: body.requestId,
      updateType: body.updateType,
    })

    return NextResponse.json({ data: { sent: true } })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error("[email] Failed to send notification:", errorMessage, {
      error: error instanceof Error ? error.stack : error,
    })

    return NextResponse.json(
      {
        error: errorMessage,
        message: "Failed to send notification email. Check server logs for details.",
      },
      { status: 500 }
    )
  }
}
