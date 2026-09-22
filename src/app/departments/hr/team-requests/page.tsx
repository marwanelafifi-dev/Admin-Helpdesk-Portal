import TeamRequestsPage from "@/app/(dashboard)/team-requests/page"
import { modulesVisibleToFunction } from "@/lib/functionRegistry"

export default function PeopleTeamRequestsPage() {
  return <TeamRequestsPage moduleScope={modulesVisibleToFunction("hr")} />
}
