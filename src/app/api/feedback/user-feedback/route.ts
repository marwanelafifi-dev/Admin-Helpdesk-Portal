import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { userFeedbackStore } from "@/lib/userFeedbackStore"

export const runtime = "nodejs"

/**
 * GET /api/feedback/user-feedback
 * Fetch feedback (public list or user's own feedback)
 */
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const mode = url.searchParams.get("mode") || "own"
  const status = url.searchParams.get("status")

  try {
    if (mode === "own") {
      let feedback = userFeedbackStore.getByUser(session.user.email || "")
      if (status) {
        feedback = feedback.filter((f) => f.status === status)
      }
      return NextResponse.json({ feedback })
    } else if (mode === "all" && (session.user.role === "Full Access" || session.user.role === "Administration Team")) {
      let feedback = userFeedbackStore.getAll()
      if (status) {
        feedback = feedback.filter((f) => f.status === status)
      }
      return NextResponse.json({ feedback })
    } else {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }
  } catch (error) {
    console.error("[user-feedback] GET failed:", error)
    return NextResponse.json({ error: "Failed to fetch feedback" }, { status: 500 })
  }
}

/**
 * POST /api/feedback/user-feedback
 * Submit new user feedback
 */
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const data = await req.json()
    const { category, title, comment, rating } = data

    if (!category || !title || !comment) {
      return NextResponse.json(
        { error: "Missing required fields: category, title, comment" },
        { status: 400 }
      )
    }

    const feedback = userFeedbackStore.create({
      userId: session.user.id || "USR-UNKNOWN",
      userEmail: session.user.email || "unknown@si-ware.com",
      userName: session.user.name || "Unknown User",
      category: category as "general" | "bug" | "feature_request" | "ui_ux",
      title,
      comment,
      rating: rating ? Math.min(Math.max(rating, 1), 5) : undefined,
      status: "new",
    })

    return NextResponse.json({ feedback }, { status: 201 })
  } catch (error) {
    console.error("[user-feedback] POST failed:", error)
    return NextResponse.json({ error: "Failed to submit feedback" }, { status: 500 })
  }
}
