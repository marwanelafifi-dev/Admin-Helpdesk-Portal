"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { getRequests, type EngineRequest } from "@/services/engineService"
import { TravelForm } from "@/modules/travel/TravelForm"

export default function NewTravelRequestPage() {
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
  const title = isEditing ? "Edit Travel Request" : "New Travel Request"
  const subtitle = isEditing ? "Update the travel request details" : "Submit a new travel request"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">{subtitle}</p>
      </div>

      {/* Form */}
      <TravelForm onCancel={() => router.push("/travel")} />
    </div>
  )
}
