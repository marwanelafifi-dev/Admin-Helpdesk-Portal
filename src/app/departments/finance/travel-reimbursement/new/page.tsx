"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import TravelReimbursementForm from "@/modules/finance/TravelReimbursementForm"
import { getRequests, type EngineRequest } from "@/services/engineService"

export default function NewTravelReimbursementRequestPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestId = searchParams.get("id")
  const [existingRequest, setExistingRequest] = useState<EngineRequest | null>(null)

  useEffect(() => {
    if (requestId) {
      const requests = getRequests()
      const request = requests.find((r) => r.id === requestId)
      if (request) setExistingRequest(request)
    }
  }, [requestId])

  const isEditing = !!requestId
  const title = isEditing ? "Edit Travel Reimbursement Request" : "New Travel Reimbursement Request"
  const subtitle = isEditing ? "Update the travel reimbursement request details" : "Submit a travel expense for reimbursement, with Authorized Manager approval"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">{subtitle}</p>
      </div>

      <TravelReimbursementForm
        onCancel={() => router.push("/departments/finance/travel-reimbursement")}
        editingRequest={existingRequest}
        isEditing={isEditing}
      />
    </div>
  )
}
