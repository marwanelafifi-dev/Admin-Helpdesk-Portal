import DashboardPage from "@/app/(dashboard)/dashboard/page"
import { modulesVisibleToFunction } from "@/lib/functionRegistry"

export default function HRDepartmentPage() {
  return (
    <DashboardPage
      moduleScope={modulesVisibleToFunction("hr")}
      title="HR Team - Dashboard"
      detailBasePath="/departments/hr/requests"
      moduleLinks={{ hr_general: "/departments/hr/general", hr_letter: "/departments/hr/letter" }}
    />
  )
}
