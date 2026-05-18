"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import MaintenanceForm from "@/modules/maintenance/MaintenanceForm"
import { getRequests, type EngineRequest } from "@/services/engineService"

export default function NewMaintenanceRequestPage() {
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
  const title = isEditing ? "Edit Maintenance Request" : "New Maintenance Request"
  const subtitle = isEditing ? "Update the maintenance issue details" : "Submit a new maintenance issue for our facilities team"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">{subtitle}</p>
      </div>

      {/* Form */}
      <MaintenanceForm
        onCancel={() => router.push("/maintenance")}
        editingRequest={existingRequest}
        isEditing={isEditing}
      />
    </div>
  )
}
