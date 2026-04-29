"use client"

import { useSearchParams } from "next/navigation"
import { HRForm } from "@/modules/hr/HRForm"

export default function NewHRRequestPage() {
  const searchParams = useSearchParams()
  const type = searchParams.get("type") === "offboarding" ? "offboarding" : "onboarding"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New HR Request</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Submit an onboarding or offboarding request for the administration team
        </p>
      </div>
      <HRForm defaultType={type} />
    </div>
  )
}
