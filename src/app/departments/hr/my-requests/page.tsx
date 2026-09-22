import RequestsPage from "@/app/(dashboard)/requests/page"
import { modulesVisibleToFunction } from "@/lib/functionRegistry"

export default function PeopleMyRequestsPage() {
  return <RequestsPage moduleScope={modulesVisibleToFunction("hr")} />
}
