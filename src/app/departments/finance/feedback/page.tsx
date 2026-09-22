import FeedbackReportsPage from "@/app/(dashboard)/feedback-reports/page"
import { modulesVisibleToFunction } from "@/lib/functionRegistry"

export default function FinanceFeedbackReportsPage() {
  return (
    <FeedbackReportsPage
      moduleScope={modulesVisibleToFunction("finance")}
      title="Finance Team - Feedback & Reports"
    />
  )
}
