import GeneralRequestPage from "@/app/(dashboard)/general/page"
import { modulesVisibleToFunction } from "@/lib/functionRegistry"

export default function HRAllRequestsPage() {
  return (
    <GeneralRequestPage
      aggregateModules={modulesVisibleToFunction("hr")}
      basePath="/departments/hr/general"
      detailPath="/departments/hr/requests"
      pageTitle="HR Team - All Requests"
      pageSubtitle="Every request submitted to the HR Team, across all HR modules"
      hideCreateButton
    />
  )
}
