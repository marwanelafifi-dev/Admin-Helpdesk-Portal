import DashboardPage from "@/app/(dashboard)/dashboard/page"
import { modulesVisibleToFunction } from "@/lib/functionRegistry"

export default function FinanceDepartmentPage() {
  return (
    <DashboardPage
      moduleScope={modulesVisibleToFunction("finance")}
      title="Finance Team - Dashboard"
      detailBasePath="/departments/finance/requests"
      moduleLinks={{ finance_reimbursement: "/departments/finance/reimbursement" }}
    />
  )
}
