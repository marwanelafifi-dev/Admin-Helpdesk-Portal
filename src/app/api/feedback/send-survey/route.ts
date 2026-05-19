import { NextRequest, NextResponse } from "next/server"
import { sendFeedbackSurveyEmail } from "@/lib/emailService"
import { feedbackStore } from "@/lib/feedbackStore"

export const runtime = "nodejs"

// Caller (the request detail page on status change to completed/delivered)
// posts requester + request info. We create the survey server-side here so
// it's persisted to disk before the email goes out, ensuring the recipient
// can actually open the link from any device.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { requesterName, requesterEmail, requestId, requestTitle, module } = body

    if (!requesterEmail || !requestId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const survey = feedbackStore.createSurvey({
      requestId,
      requesterEmail,
      requesterName: requesterName || "Unknown User",
      requestTitle: requestTitle || requestId,
      module: module || "general",
    })

    await sendFeedbackSurveyEmail({
      surveyId: survey.id,
      requesterName: survey.requesterName,
      requesterEmail: survey.requesterEmail,
      requestId: survey.requestId,
      requestTitle: survey.requestTitle,
      module: survey.module,
    })

    feedbackStore.markSent(survey.id)

    console.log(`[feedback] Survey ${survey.id} created and email sent to ${requesterEmail} for request ${requestId}`)
    return NextResponse.json({ success: true, surveyId: survey.id })
  } catch (error: any) {
    console.error("[feedback] Failed to send survey email:", error?.message)
    return NextResponse.json({ error: error?.message ?? "Failed to send" }, { status: 500 })
  }
}
