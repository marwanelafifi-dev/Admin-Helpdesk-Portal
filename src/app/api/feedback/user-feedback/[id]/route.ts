import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { userFeedbackStore, type FeedbackStatus } from "@/lib/userFeedbackStore"

export const runtime = "nodejs"

/**
 * PATCH /api/feedback/user-feedback/[id]
 * Update feedback status (Full Access only)
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

    const updated = userFeedbackStore.updateStatus(params.id, status as FeedbackStatus)
    if (!updated) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 })
    }

    return NextResponse.json({ feedback: updated })
  } catch (error) {
    console.error("[user-feedback] PATCH failed:", error)
    return NextResponse.json({ error: "Failed to update feedback" }, { status: 500 })
  }
}
