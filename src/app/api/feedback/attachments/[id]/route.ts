import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { userFeedbackStore } from "@/lib/userFeedbackStore"

export const runtime = "nodejs"

/**
 * GET /api/feedback/attachments/[id]
 * Download/preview attachment from feedback
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const [feedbackId, attachmentId] = params.id.split("--")

    if (!feedbackId || !attachmentId) {
      return NextResponse.json({ error: "Invalid attachment ID format" }, { status: 400 })
    }

    // Get feedback to verify user has access
    const feedback = userFeedbackStore.getById(feedbackId)
    if (!feedback) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 })
    }

    // Check access: own feedback or admin
    const isOwner = feedback.userEmail.toLowerCase() === (session.user.email || "").toLowerCase()
    const isAdmin = session.user.role === "Full Access" || session.user.role === "Administration Team"

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Find attachment
    const attachment = feedback.attachments?.find((a) => a.id === attachmentId)
    if (!attachment) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 })
    }

    // Parse data URL
    if (!attachment.url.startsWith("data:")) {
      return NextResponse.json({ error: "Invalid attachment data" }, { status: 400 })
    }

    const [header, data] = attachment.url.split(",")
    const mimeType = header.match(/:(.*?);/)?.[1] || attachment.type || "application/octet-stream"
    const buffer = Buffer.from(data, "base64")

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": buffer.length.toString(),
        "Content-Disposition": `attachment; filename="${attachment.name}"`,
      },
    })
  } catch (error) {
    console.error("[feedback-attachment] GET failed:", error)
    return NextResponse.json({ error: "Failed to fetch attachment" }, { status: 500 })
  }
}
