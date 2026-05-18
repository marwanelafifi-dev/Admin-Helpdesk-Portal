"use client"

import { useRouter } from "next/navigation"
import MaintenanceForm from "@/modules/maintenance/MaintenanceForm"
import { Wrench } from "lucide-react"

export default function NewMaintenanceRequestPage() {
  const router = useRouter()

  return (
    <div className="request-page space-y-6">
      <div className="request-page-header">
        <div className="request-page-header-icon">
          <Wrench className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h1>New Maintenance Request</h1>
          <p>
            Submit a clear issue report so facilities can triage and resolve it faster.
          </p>
        </div>
      </div>

      <MaintenanceForm onCancel={() => router.push("/maintenance")} />
    </div>
  )
}
