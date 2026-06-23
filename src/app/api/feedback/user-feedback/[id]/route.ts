import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { userFeedbackStore, type FeedbackStatus } from "@/lib/userFeedbackStore"
import { notificationStore } from "@/lib/notificationStore"
import { sendFeedbackStatusChangeEmail } from "@/lib/emailService"

export const runtime = "nodejs"

/**
 * PATCH /api/feedback/user-feedback/[id]
 * Update feedback status (Full Access only)
 * Triggers: in-app notification + email to feedback submitter
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Only Full Access can update feedback status
  if (session.user.role !== "Full Access") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { status } = await req.json()

    if (!status) {
      return NextResponse.json(
        { error: "Missing required field: status" },
        { status: 400 }
      )
    }

    const validStatuses: FeedbackStatus[] = ["new", "in_progress", "completed", "resolved", "cancelled"]
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be one of: " + validStatuses.join(", ") },
        { status: 400 }
      )
    }

    // Get the feedback before update to check old status
    const feedback = userFeedbackStore.getById(params.id)
    if (!feedback) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 })
    }

    const oldStatus = feedback.status

    // Update the status
    const updated = userFeedbackStore.updateStatus(params.id, status as FeedbackStatus)
    if (!updated) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 })
    }

    // Only send notifications if status actually changed
    if (oldStatus !== status) {
      // Create in-app notification
      try {
        notificationStore.create({
          userId: feedback.userId,
          userEmail: feedback.userEmail,
          type: "feedback_status_change",
          title: `Feedback Status Changed to ${status.replace("_", " ").toUpperCase()}`,
          message: `Your feedback "${feedback.title}" has been updated to ${status.replace("_", " ")}.`,
          relatedId: params.id,
          isRead: false,
        })
      } catch (err) {
        console.warn("[feedback-notification] Failed to create in-app notification:", err)
      }

      // Send email notification
      try {
        await sendFeedbackStatusChangeEmail(feedback, status as FeedbackStatus, session.user.name || "Administrator")
      } catch (err) {
        console.warn("[feedback-email] Failed to send status change email:", err)
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({ feedback: updated })
  } catch (error) {
    console.error("[user-feedback] PATCH failed:", error)
    return NextResponse.json({ error: "Failed to update feedback" }, { status: 500 })
  }
}
