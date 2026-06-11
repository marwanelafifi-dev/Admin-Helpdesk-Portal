"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { getRequests, type EngineRequest } from "@/services/engineService"
import { EventForm } from "@/modules/event/EventForm"

export default function NewEventRequestPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestId = searchParams.get("id")
  const [existingRequest, setExistingRequest] = useState<EngineRequest | null>(null)

  useEffect(() => {
    if (requestId) {
      const requests = getRequests()
      const request = requests.find(r => r.id === requestId)
      if (request) setExistingRequest(request)
    }
  }, [requestId])

  const isEditing = !!requestId
  const title = isEditing ? "Edit Event Request" : "New Event Request"
  const subtitle = isEditing ? "Update the event request details" : "Submit a new event request"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">{subtitle}</p>
      </div>
      <EventForm
        onCancel={() => router.push("/event")}
        isEditing={isEditing}
        editingRequest={existingRequest}
      />
    </div>
  )
}
