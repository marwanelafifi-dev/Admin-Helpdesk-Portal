import GeneralRequestPage from "@/app/(dashboard)/general/page"
import { modulesVisibleToFunction } from "@/lib/functionRegistry"

export default function FinanceAllRequestsPage() {
  return (
    <GeneralRequestPage
      aggregateModules={modulesVisibleToFunction("finance")}
      basePath="/departments/finance/reimbursement"
      detailPath="/departments/finance/requests"
      pageTitle="Finance Team - All Requests"
      pageSubtitle="Every request submitted to the Finance Team, across all Finance modules"
      hasApprovalStep
      hideCreateButton
    />
  )
}
