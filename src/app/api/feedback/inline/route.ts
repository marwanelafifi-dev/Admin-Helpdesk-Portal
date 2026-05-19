import { NextRequest, NextResponse } from "next/server"
import { feedbackStore } from "@/lib/feedbackStore"
import { auth } from "@/auth"

export const runtime = "nodejs"

// Auth-protected — in-page Submit Feedback button.
// Creates a survey and immediately marks it completed with the supplied rating/comment.
// Used when the requester rates the service directly from the request detail page
// instead of via the email survey link.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }

  const { requestId, requestTitle, module, requesterName, requesterEmail, rating, comment } = body
  const r = Number(rating)
  if (!requestId || !Number.isInteger(r) || r < 1 || r > 5) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 })
  }

  const safeComment = typeof comment === "string" ? comment : ""

  // If a completed response already exists for this request, refuse — one
  // feedback per request.
  const alreadyCompleted = feedbackStore.getResponses().find((x) => x.requestId === requestId)
  if (alreadyCompleted) {
    return NextResponse.json({ error: "already_submitted", response: alreadyCompleted }, { status: 409 })
  }

  // If an email survey is still pending for this request, complete THAT one
  // (so the email link becomes invalid for re-use). Otherwise create + complete
  // a new survey in one shot.
  const pending = feedbackStore.findPendingForRequest(requestId)
  const survey = pending ?? feedbackStore.createSurvey({
    requestId,
    requesterName: requesterName || session.user.name || "Unknown User",
    requesterEmail: requesterEmail || session.user.email || "",
    requestTitle: requestTitle || requestId,
    module: module || "general",
  })

  const response = feedbackStore.submitResponse(survey.id, r, safeComment)
  return NextResponse.json({ response })
}
