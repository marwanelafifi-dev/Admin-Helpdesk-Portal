import { NextRequest, NextResponse } from "next/server"
import { sendFeedbackSurveyEmail } from "@/lib/emailService"
import { feedbackStore } from "@/lib/feedbackStore"
import { loadSettingsServer } from "@/lib/settingsServer"
import { requestStore } from "@/lib/requestStore"
import { functionForModule } from "@/lib/functionRegistry"
import { auth } from "@/auth"

export const runtime = "nodejs"

// Caller (the request detail page on status change to completed/delivered)
// posts requester + request info. We create the survey server-side here so
// it's persisted to disk before the email goes out, ensuring the recipient
// can actually open the link from any device.
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const body = await req.json()
    const { requestId } = body

    if (!requestId || typeof requestId !== "string") return NextResponse.json({ error: "Missing request ID" }, { status: 400 })
    const request = requestStore.get(requestId)
    if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 })
    if (!["completed", "delivered"].includes(request.status)) return NextResponse.json({ error: "Feedback is available only after completion" }, { status: 409 })
    if (!request.requesterEmail) return NextResponse.json({ error: "Request has no requester email" }, { status: 400 })
    const requesterEmail = request.requesterEmail

    const platformSettings = loadSettingsServer()
    const functionId = functionForModule(request.module)
    const surveySettings = platformSettings.feedbackSurveysByFunction[functionId]
    if (!surveySettings.enabled) {
      console.log(`[feedback] Surveys disabled for ${functionId} — skipping ${requestId}`)
      return NextResponse.json({ success: true, skipped: true, reason: "surveys_disabled" })
    }

    // One survey email per request. If a survey already exists for this
    // request (pending, sent, or completed), skip — status changes that
    // re-enter the completed state must not trigger a second email.
    if (feedbackStore.hasSurveyForRequest(requestId)) {
      console.log(`[feedback] Skipping survey email for ${requestId} — survey already exists`)
      return NextResponse.json({ success: true, skipped: true, reason: "already_sent" })
    }

    const survey = feedbackStore.createSurvey({
      requestId,
      requesterEmail: request.requesterEmail,
      requesterName: request.requesterName || "Unknown User",
      requestTitle: request.title || requestId,
      module: request.module,
    })

    await sendFeedbackSurveyEmail({
      surveyId: survey.id,
      requesterName: survey.requesterName,
      requesterEmail: survey.requesterEmail,
      requestId: survey.requestId,
      requestTitle: survey.requestTitle,
      module: survey.module,
      customSubject: surveySettings.subject || undefined,
      customBody: surveySettings.body || undefined,
    })

    feedbackStore.markSent(survey.id)

    console.log(`[feedback] Survey ${survey.id} created and email sent to ${requesterEmail} for request ${requestId}`)
    return NextResponse.json({ success: true, surveyId: survey.id })
  } catch (error: any) {
    console.error("[feedback] Failed to send survey email:", error?.message)
    return NextResponse.json({ error: error?.message ?? "Failed to send" }, { status: 500 })
  }
}
