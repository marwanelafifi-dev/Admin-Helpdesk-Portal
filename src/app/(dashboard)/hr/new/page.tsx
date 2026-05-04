"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { HRForm } from "@/modules/hr/HRForm"
import { getRequests, type EngineRequest } from "@/services/engineService"

export default function NewHRRequestPage() {
  const searchParams = useSearchParams()
  const type = searchParams.get("type") === "offboarding" ? "offboarding" : "onboarding"
  const requestId = searchParams.get("id")
  const [existingRequest, setExistingRequest] = useState<EngineRequest | null>(null)

  useEffect(() => {
    if (requestId) {
      const requests = getRequests()
      const request = requests.find(r => r.id === requestId)
      if (request) {
        setExistingRequest(request)
      }
    }
  }, [requestId])

  const isEditing = !!requestId
  const title = isEditing ? "Edit HR Request" : "New HR Request"
  const subtitle = isEditing ? "Update the HR request details" : "Submit an onboarding or offboarding request for the administration team"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">{subtitle}</p>
      </div>
      <HRForm
        defaultType={type}
        editingRequest={existingRequest}
        isEditing={isEditing}
      />
    </div>
  )
}
