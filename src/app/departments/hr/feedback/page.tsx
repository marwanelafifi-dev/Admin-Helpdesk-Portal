import FeedbackReportsPage from "@/app/(dashboard)/feedback-reports/page"
import { modulesVisibleToFunction } from "@/lib/functionRegistry"

export default function HRFeedbackReportsPage() {
  return (
    <FeedbackReportsPage
      moduleScope={modulesVisibleToFunction("hr")}
      title="HR Team - Feedback & Reports"
    />
  )
}
