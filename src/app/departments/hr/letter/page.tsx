import GeneralRequestPage from "@/app/(dashboard)/general/page"

export default function HRLetterRequestsPage() {
  return (
    <GeneralRequestPage
      moduleId="hr_letter"
      basePath="/departments/hr/letter"
      detailPath="/departments/hr/requests"
      pageTitle="HR Team - HR Letter Requests"
      pageSubtitle="Submit and manage requests for official HR letters and certificates"
      createButtonLabel="New HR Letter Request"
    />
  )
}
