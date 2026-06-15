"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import PurchaseForm from "@/modules/purchase/PurchaseForm"
import { getRequests, type EngineRequest } from "@/services/engineService"

export default function NewPurchaseRequestPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
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
  const title = isEditing ? "Edit Purchase Request" : "New Purchase Request"
  const subtitle = isEditing ? "Update the purchase request details" : "Submit a purchase request for items from Amazon, Noon, or other suppliers"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">{subtitle}</p>
      </div>

      {/* Form */}
      <PurchaseForm
        onCancel={() => router.push("/purchase")}
        editingRequest={existingRequest}
        isEditing={isEditing}
      />
    </div>
  )
}
