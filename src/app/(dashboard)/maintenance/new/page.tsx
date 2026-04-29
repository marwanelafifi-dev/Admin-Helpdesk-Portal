"use client"

import { useRouter } from "next/navigation"
import MaintenanceForm from "@/modules/maintenance/MaintenanceForm"

export default function NewMaintenanceRequestPage() {
  const router = useRouter()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Maintenance Request</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Submit a new maintenance issue for our facilities team
        </p>
      </div>

      {/* Form */}
      <MaintenanceForm onCancel={() => router.push("/maintenance")} />
    </div>
  )
}
