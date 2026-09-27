import { sendFeedbackSurveyEmail } from "@/lib/emailService"
import { feedbackStore } from "@/lib/feedbackStore"
import { functionForModule } from "@/lib/functionRegistry"
import { loadSettingsServer } from "@/lib/settingsServer"

type FeedbackEligibleRequest = {
  id: string
  module: string
  status: string
  requesterEmail?: string | null
  requesterName?: string | null
  title?: string | null
}

export type FeedbackSurveyDeliveryResult =
  | { outcome: "sent"; surveyId: string; retried: boolean }
  | { outcome: "skipped"; reason: "not_completed" | "missing_requester_email" | "surveys_disabled" | "already_sent" }
  | { outcome: "failed"; surveyId: string; error: string }

/** Server-owned survey delivery for every request function. */
export async function deliverFeedbackSurveyForRequest(
  request: FeedbackEligibleRequest,
): Promise<FeedbackSurveyDeliveryResult> {
  if (request.status !== "completed" && request.status !== "delivered") {
    return { outcome: "skipped", reason: "not_completed" }
  }
  if (!request.requesterEmail) {
    return { outcome: "skipped", reason: "missing_requester_email" }
  }

  const functionId = functionForModule(request.module)
  const surveySettings = loadSettingsServer().feedbackSurveysByFunction?.[functionId]
  if (!surveySettings?.enabled) {
    console.log(`[feedback] Surveys disabled for ${functionId}; skipping ${request.id}`)
    return { outcome: "skipped", reason: "surveys_disabled" }
  }

  const pendingSurvey = feedbackStore.findPendingForRequest(request.id)
  if (feedbackStore.hasSurveyForRequest(request.id) && !pendingSurvey) {
    console.log(`[feedback] Skipping survey for ${request.id}; it was already sent or completed`)
    return { outcome: "skipped", reason: "already_sent" }
  }

  const survey = pendingSurvey ?? feedbackStore.createSurvey({
    requestId: request.id,
    requesterEmail: request.requesterEmail,
    requesterName: request.requesterName || "Unknown User",
    requestTitle: request.title || request.id,
    module: request.module,
  })

  try {
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
    console.log(`[feedback] Survey ${survey.id} emailed for request ${request.id}`)
    return { outcome: "sent", surveyId: survey.id, retried: Boolean(pendingSurvey) }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email delivery error"
    console.error(`[feedback] Survey ${survey.id} delivery failed for ${request.id}:`, message)
    return { outcome: "failed", surveyId: survey.id, error: "Feedback email delivery failed; the survey remains queued for retry." }
  }
}
