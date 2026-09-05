import { Suspense } from "react"
import NewGeneralRequestPage from "@/app/(dashboard)/general/new/page"

export default function NewHRLetterRequestPage() {
  return (
    <Suspense fallback={<p className="py-12 text-center text-sm text-slate-500">Loading request form...</p>}>
      <NewGeneralRequestPage
        moduleId="hr_letter"
        basePath="/departments/hr/letter"
        requestLabel="HR Letter Request"
        formSubtitle="Submit a request for an official HR letter or certificate (e.g. employment verification, salary certificate)."
      />
    </Suspense>
  )
}
