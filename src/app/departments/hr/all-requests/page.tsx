import GeneralRequestPage from "@/app/(dashboard)/general/page"
import { HR_MODULE_IDS } from "@/modules/hr/hrModules"

export default function HRAllRequestsPage() {
  return (
    <GeneralRequestPage
      aggregateModules={HR_MODULE_IDS}
      basePath="/departments/hr/general"
      detailPath="/departments/hr/requests"
      pageTitle="HR Team - All Requests"
      pageSubtitle="Every request submitted to the HR Team, across all HR modules"
      hideCreateButton
    />
  )
}
