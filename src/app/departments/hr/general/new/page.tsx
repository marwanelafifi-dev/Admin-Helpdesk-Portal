import { Suspense } from "react"
import NewGeneralRequestPage from "@/app/(dashboard)/general/new/page"

export default function NewHRGeneralRequestPage() {
  return (
    <Suspense fallback={<p className="py-12 text-center text-sm text-slate-500">Loading request form...</p>}>
      <NewGeneralRequestPage
        moduleId="hr_general"
        basePath="/departments/hr/general"
        departmentName="HR Team"
      />
    </Suspense>
  )
}
