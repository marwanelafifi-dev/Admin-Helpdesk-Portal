import RequestsPage from "@/app/(dashboard)/requests/page"
import { modulesVisibleToFunction } from "@/lib/functionRegistry"

export default function FinanceMyRequestsPage() {
  return <RequestsPage moduleScope={modulesVisibleToFunction("finance")} />
}
