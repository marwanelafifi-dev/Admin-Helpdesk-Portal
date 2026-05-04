"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import ShippingForm from "@/modules/shipping/ShippingForm"
import { getRequests, type EngineRequest } from "@/services/engineService"

export default function NewShippingRequestPage() {
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
  const title = isEditing ? "Edit Shipping Request" : "New Shipping Request"
  const subtitle = isEditing ? "Update the shipping request details" : "Fill in the details below and submit for approval"

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/shipping"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Shipping
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">{subtitle}</p>
      </div>

      <ShippingForm
        editingRequest={existingRequest}
        isEditing={isEditing}
      />
    </div>
  )
}
