import { useEffect } from "react"
import { processPendingFeedbackSurveys } from "@/services/feedbackService"

/**
 * Hook to periodically process pending feedback surveys
 * Checks every 5 minutes if any surveys should be sent (1+ hour after creation)
 */
export function useFeedbackSurveyProcessor() {
  useEffect(() => {
    // Process immediately on mount
    processPendingFeedbackSurveys()

    // Then process every 5 minutes
    const interval = setInterval(() => {
      processPendingFeedbackSurveys()
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])
}
