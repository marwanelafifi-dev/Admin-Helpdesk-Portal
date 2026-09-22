import TeamRequestsPage from "@/app/(dashboard)/team-requests/page"
import { modulesVisibleToFunction } from "@/lib/functionRegistry"

export default function FinanceTeamRequestsPage() {
  return <TeamRequestsPage moduleScope={modulesVisibleToFunction("finance")} />
}
