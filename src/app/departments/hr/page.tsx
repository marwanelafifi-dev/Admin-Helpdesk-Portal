import DashboardPage from "@/app/(dashboard)/dashboard/page"
import { HR_MODULE_IDS } from "@/modules/hr/hrModules"

export default function HRDepartmentPage() {
  return (
    <DashboardPage
      moduleScope={HR_MODULE_IDS}
      title="HR Team - Dashboard"
      detailBasePath="/departments/hr/requests"
      moduleLinks={{ hr_general: "/departments/hr/general" }}
    />
  )
}
