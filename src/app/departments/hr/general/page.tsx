import GeneralRequestPage from "@/app/(dashboard)/general/page"

export default function HRGeneralRequestsPage() {
  return (
    <GeneralRequestPage
      moduleId="hr_general"
      basePath="/departments/hr/general"
      detailPath="/departments/hr/requests"
      pageTitle="HR Team - General Requests"
      pageSubtitle="Submit and manage general requests addressed to the HR Team"
    />
  )
}
