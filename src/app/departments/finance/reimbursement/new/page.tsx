"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import ReimbursementForm from "@/modules/finance/ReimbursementForm"
import { getRequests, type EngineRequest } from "@/services/engineService"

export default function NewReimbursementRequestPage() {
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
  const title = isEditing ? "Edit Reimbursement Request" : "New Reimbursement Request"
  const subtitle = isEditing ? "Update the reimbursement request details" : "Submit an expense for reimbursement, with manager approval"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">{subtitle}</p>
      </div>

      <ReimbursementForm
        onCancel={() => router.push("/departments/finance/reimbursement")}
        editingRequest={existingRequest}
        isEditing={isEditing}
      />
    </div>
  )
}
