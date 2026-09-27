import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { adminSurveyStore } from "@/lib/adminSurveyStore"

export const runtime = "nodejs"

const VALID_CATEGORIES = new Set(["general", "bug", "feature_request", "ui_ux"])
const VALID_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"])
const VALID_FUNCTIONS = new Set(["Home Page", "Administration Team", "Finance Team", "People Team"])
const FUNCTION_MODULES: Record<string, Set<string>> = {
  "Administration Team": new Set(["Shipping", "Maintenance", "Purchase", "Event", "Travel", "General", "HR — Onboarding", "HR — Offboarding"]),
  "Finance Team": new Set(["Reimbursement", "Travel Reimbursement", "Invoice Payment", "Finance Requests"]),
  "People Team": new Set(["HR General Request", "Letter Request", "Travel Letter"]),
}
const recentSubmissions = new Map<string, number[]>()

function limitedText(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : ""
}

function validateAttachments(value: unknown) {
  if (!Array.isArray(value)) return []
  if (value.length > 3) throw new Error("You can attach up to three screenshots.")
  let totalSize = 0
  return value.map((attachment, index) => {
    if (!attachment || typeof attachment !== "object") throw new Error("An attachment is invalid.")
    const item = attachment as Record<string, unknown>
    const type = limitedText(item.type, 80)
    const name = limitedText(item.name, 120)
    const url = limitedText(item.url, 1_500_000)
    const size = typeof item.size === "number" && Number.isFinite(item.size) ? item.size : 0
    if (!VALID_IMAGE_TYPES.has(type) || !url.startsWith(`data:${type};base64,`) || !name || size <= 0 || size > 1_000_000) {
      throw new Error("Screenshots must be PNG, JPEG, or WebP files no larger than 1 MB.")
    }
    totalSize += size
    if (totalSize > 2_000_000) throw new Error("The combined screenshot size cannot exceed 2 MB.")
    return { id: limitedText(item.id, 80) || `attachment-${index + 1}`, name, type, size, url, uploadedAt: new Date().toISOString() }
  })
}

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
    } else if (mode === "all" && session.user.role === "Full Access") {
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
    const { category, title, comment, rating, attachments, context } = data

    const safeCategory = limitedText(category, 40)
    const safeTitle = limitedText(title, 140)
    const safeComment = limitedText(comment, 3_000)
    const rawContext = context && typeof context === "object" ? context as Record<string, unknown> : {}
    const safeFunctionName = limitedText(rawContext.functionName, 80)
    const safeModuleName = limitedText(rawContext.moduleName, 80)
    if (!VALID_CATEGORIES.has(safeCategory) || !safeTitle || !safeComment) {
      return NextResponse.json(
        { error: "Provide a category, title, and description." },
        { status: 400 }
      )
    }
    if (!VALID_FUNCTIONS.has(safeFunctionName)) {
      return NextResponse.json({ error: "Choose the function this feedback is about." }, { status: 400 })
    }
    if (safeFunctionName !== "Home Page" && !FUNCTION_MODULES[safeFunctionName]?.has(safeModuleName)) {
      return NextResponse.json({ error: "Choose a valid module for the selected function." }, { status: 400 })
    }
    const email = (session.user.email || "unknown@si-ware.com").toLowerCase()
    const now = Date.now()
    const recent = (recentSubmissions.get(email) || []).filter((time) => now - time < 60 * 60 * 1000)
    if (recent.length >= 5) return NextResponse.json({ error: "You have reached the feedback limit (5 submissions per hour). Please try again later." }, { status: 429 })
    const safeAttachments = validateAttachments(attachments)
    recent.push(now)
    recentSubmissions.set(email, recent)
    const survey = adminSurveyStore.create({
      userId: session.user.id || "USR-UNKNOWN",
      userEmail: email,
      userName: session.user.name || "Unknown User",
      category: safeCategory as "general" | "bug" | "feature_request" | "ui_ux",
      title: safeTitle,
      comment: safeComment,
      rating: rating ? Math.min(Math.max(rating, 1), 5) : undefined,
      attachments: safeAttachments,
      context: {
        pageUrl: limitedText(rawContext.pageUrl, 500),
        path: limitedText(rawContext.path, 300),
        functionName: safeFunctionName,
        moduleName: safeModuleName || undefined,
        userAgent: limitedText(rawContext.userAgent, 300),
      },
      status: "new",
    })

    return NextResponse.json({ survey }, { status: 201 })
  } catch (error) {
    console.error("[admin-survey] POST failed:", error)
    return NextResponse.json({ error: "Failed to submit survey" }, { status: 500 })
  }
}

/** Update feedback workflow status (platform administrators only). */
export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "Full Access") {
    return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 })
  }
  try {
    const { id, status } = await req.json()
    const validStatuses = new Set(["new", "in_progress", "completed", "resolved", "cancelled"])
    if (typeof id !== "string" || !validStatuses.has(status)) {
      return NextResponse.json({ error: "Provide a valid feedback item and status." }, { status: 400 })
    }
    const survey = adminSurveyStore.updateStatus(id, status)
    if (!survey) return NextResponse.json({ error: "Feedback item not found." }, { status: 404 })
    return NextResponse.json({ survey })
  } catch (error) {
    console.error("[admin-survey] PATCH failed:", error)
    return NextResponse.json({ error: "Failed to update feedback status" }, { status: 500 })
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
  if (session.user.role !== "Full Access") {
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
