"use client"

import { useRouter } from "next/navigation"
import { TravelForm } from "@/modules/travel/TravelForm"

export default function NewTravelRequestPage() {
  const router = useRouter()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Travel Request</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Request approval for business travel
        </p>
      </div>

      {/* Form */}
      <TravelForm onCancel={() => router.push("/travel")} />
    </div>
  )
}
