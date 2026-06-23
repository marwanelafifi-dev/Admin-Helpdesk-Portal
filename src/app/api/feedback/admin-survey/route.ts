import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { adminSurveyStore } from "@/lib/adminSurveyStore"

export const runtime = "nodejs"

/**
 * GET /api/feedback/admin-survey
 * Fetch admin survey responses (own or all if admin)
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
      let surveys = adminSurveyStore.getByUser(session.user.email || "")
      if (status) {
        surveys = surveys.filter((s) => s.status === status)
      }
      return NextResponse.json({ surveys })
    } else if (mode === "all" && (session.user.role === "Full Access" || session.user.role === "Administration Team")) {
      let surveys = adminSurveyStore.getAll()
      if (status) {
        surveys = surveys.filter((s) => s.status === status)
      }
      return NextResponse.json({ surveys })
    } else {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }
  } catch (error) {
    console.error("[admin-survey] GET failed:", error)
    return NextResponse.json({ error: "Failed to fetch surveys" }, { status: 500 })
  }
}

/**
 * POST /api/feedback/admin-survey
 * Submit new admin survey response
 */
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const data = await req.json()
    const { category, title, comment, rating, attachments } = data

    if (!category || !title || !comment) {
      return NextResponse.json(
        { error: "Missing required fields: category, title, comment" },
        { status: 400 }
      )
    }

    const survey = adminSurveyStore.create({
      userId: session.user.id || "USR-UNKNOWN",
      userEmail: session.user.email || "unknown@si-ware.com",
      userName: session.user.name || "Unknown User",
      category: category as "general" | "bug" | "feature_request" | "ui_ux",
      title,
      comment,
      rating: rating ? Math.min(Math.max(rating, 1), 5) : undefined,
      attachments: attachments || [],
      status: "new",
    })

    return NextResponse.json({ survey }, { status: 201 })
  } catch (error) {
    console.error("[admin-survey] POST failed:", error)
    return NextResponse.json({ error: "Failed to submit survey" }, { status: 500 })
  }
}

/**
 * DELETE /api/feedback/admin-survey
 * Clear all admin survey responses (admin only)
 */
export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Only Full Access and Administration Team can delete all surveys
  if (session.user.role !== "Full Access" && session.user.role !== "Administration Team") {
    return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 })
  }

  try {
    const count = adminSurveyStore.deleteAll()
    return NextResponse.json({
      success: true,
      message: `Deleted ${count} survey records`,
      deletedCount: count
    })
  } catch (error) {
    console.error("[admin-survey] DELETE failed:", error)
    return NextResponse.json({ error: "Failed to delete surveys" }, { status: 500 })
  }
}
