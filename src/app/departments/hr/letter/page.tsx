import GeneralRequestPage from "@/app/(dashboard)/general/page"

export default function HRLetterRequestsPage() {
  return (
    <GeneralRequestPage
      moduleId="hr_letter"
      // Travel requests that require an HR letter create an hr_travel_letter
      // record. Both kinds belong in the People Team's single letter queue.
      aggregateModules={["hr_letter", "hr_travel_letter"]}
      basePath="/departments/hr/letter"
      detailPath="/departments/hr/requests"
      pageTitle="People Team - HR Letter Requests"
      pageSubtitle="Submit and manage requests for official HR letters and certificates"
      createButtonLabel="New HR Letter Request"
    />
  )
}
