import type { EngineRequest } from "./engineService"

export interface FeedbackSurvey {
  id: string
  requestId: string
  requesterEmail: string
  requesterName: string
  requestTitle: string
  module: string
  status: "pending" | "sent" | "completed"
  rating?: number
  comment?: string
  sentAt?: string
  completedAt?: string
  createdAt: string
}

const FEEDBACK_SURVEYS_KEY = "feedback_surveys"
const FEEDBACK_RESPONSES_KEY = "feedback_responses"

// Get all feedback surveys
export function getFeedbackSurveys(): FeedbackSurvey[] {
  if (typeof window === "undefined") return []
  const surveys = localStorage.getItem(FEEDBACK_SURVEYS_KEY)
  return surveys ? JSON.parse(surveys) : []
}

// Get all feedback responses
export function getFeedbackResponses(): FeedbackSurvey[] {
  if (typeof window === "undefined") return []
  const responses = localStorage.getItem(FEEDBACK_RESPONSES_KEY)
  return responses ? JSON.parse(responses) : []
}

// Create feedback survey for a completed request
export function createFeedbackSurvey(request: EngineRequest): FeedbackSurvey {
  const survey: FeedbackSurvey = {
    id: `FB-${Date.now()}`,
    requestId: request.id,
    requesterEmail: request.requesterEmail || "unknown@example.com",
    requesterName: request.requesterName || "Unknown User",
    requestTitle: request.title,
    module: request.module as string,
    status: "pending",
    createdAt: new Date().toISOString(),
  }

  if (typeof window !== "undefined") {
    const surveys = getFeedbackSurveys()
    surveys.push(survey)
    localStorage.setItem(FEEDBACK_SURVEYS_KEY, JSON.stringify(surveys))
  }

  return survey
}

// Send feedback survey (simulate email)
export function sendFeedbackSurvey(surveyId: string): boolean {
  if (typeof window === "undefined") return false

  const surveys = getFeedbackSurveys()
  const survey = surveys.find((s) => s.id === surveyId)

  if (!survey) return false

  survey.status = "sent"
  survey.sentAt = new Date().toISOString()

  localStorage.setItem(FEEDBACK_SURVEYS_KEY, JSON.stringify(surveys))

  // Simulate email sending
  console.log(`📧 Feedback survey sent to ${survey.requesterEmail}`)
  console.log(`   Request: ${survey.requestTitle}`)
  console.log(`   Survey Link: ${window.location.origin}/feedback-survey?id=${survey.id}`)

  return true
}

// Submit feedback response
export function submitFeedbackResponse(
  surveyId: string,
  rating: number,
  comment: string
): FeedbackSurvey | null {
  if (typeof window === "undefined") return null

  const surveys = getFeedbackSurveys()
  const survey = surveys.find((s) => s.id === surveyId)

  if (!survey) return null

  const response: FeedbackSurvey = {
    ...survey,
    rating,
    comment,
    status: "completed",
    completedAt: new Date().toISOString(),
  }

  // Remove from pending surveys
  const filteredSurveys = surveys.filter((s) => s.id !== surveyId)
  localStorage.setItem(FEEDBACK_SURVEYS_KEY, JSON.stringify(filteredSurveys))

  // Add to responses
  const responses = getFeedbackResponses()
  responses.push(response)
  localStorage.setItem(FEEDBACK_RESPONSES_KEY, JSON.stringify(responses))

  return response
}

// Get pending surveys to send
export function getPendingSurveys(): FeedbackSurvey[] {
  const surveys = getFeedbackSurveys()
  const now = Date.now()

  return surveys.filter((survey) => {
    const createdTime = new Date(survey.createdAt).getTime()
    const oneHourInMs = 60 * 60 * 1000
    return now - createdTime >= oneHourInMs && survey.status === "pending"
  })
}

// Auto-send pending surveys
export function processPendingFeedbackSurveys(): number {
  const pending = getPendingSurveys()
  let sent = 0

  pending.forEach((survey) => {
    if (sendFeedbackSurvey(survey.id)) {
      sent++
    }
  })

  return sent
}
