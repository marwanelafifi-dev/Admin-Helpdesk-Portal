import { NextRequest, NextResponse } from "next/server"
import { sendFeedbackSurveyEmail } from "@/lib/emailService"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { surveyId, requesterName, requesterEmail, requestId, requestTitle, module } = body

    if (!surveyId || !requesterEmail || !requestId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    await sendFeedbackSurveyEmail({
      surveyId,
      requesterName,
      requesterEmail,
      requestId,
      requestTitle,
      module,
    })

    console.log(`[feedback] Survey email sent to ${requesterEmail} for request ${requestId}`)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[feedback] Failed to send survey email:", error?.message)
    return NextResponse.json({ error: error?.message ?? "Failed to send" }, { status: 500 })
  }
}
