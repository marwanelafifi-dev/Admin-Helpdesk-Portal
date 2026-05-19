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

  const survey = feedbackStore.createSurvey({
    requestId,
    requesterName: requesterName || session.user.name || "Unknown User",
    requesterEmail: requesterEmail || session.user.email || "",
    requestTitle: requestTitle || requestId,
    module: module || "general",
  })

  const response = feedbackStore.submitResponse(survey.id, r, typeof comment === "string" ? comment : "")
  return NextResponse.json({ response })
}
