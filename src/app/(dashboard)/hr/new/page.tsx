"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { HRForm } from "@/modules/hr/HRForm"
import { UserPlus } from "lucide-react"

function NewHRRequestInner() {
  const searchParams = useSearchParams()
  const type =
    searchParams.get("type") === "offboarding" ? "offboarding" : "onboarding"

  return (
    <div className="request-page space-y-6">
      <div className="request-page-header">
        <div className="request-page-header-icon">
          <UserPlus className="h-5 w-5" />
        </div>
        <div>
          <h1>New HR Request</h1>
          <p>Submit an onboarding or offboarding request for the administration team</p>
        </div>
      </div>
      <HRForm defaultType={type} />
    </div>
  )
}

export default function NewHRRequestPage() {
  return (
    <Suspense
      fallback={
        <div className="request-page space-y-6">
          <div className="request-page-header">
            <div className="request-page-header-icon">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h1>New HR Request</h1>
              <p>Loading...</p>
            </div>
          </div>
        </div>
      }
    >
      <NewHRRequestInner />
    </Suspense>
  )
}
