"use client"

import { useRouter } from "next/navigation"
import { TravelForm } from "@/modules/travel/TravelForm"
import { Plane } from "lucide-react"

export default function NewTravelRequestPage() {
  const router = useRouter()

  return (
    <div className="request-page space-y-6">
      <div className="request-page-header">
        <div className="request-page-header-icon">
          <Plane className="h-5 w-5" />
        </div>
        <div>
          <h1>New Travel Request</h1>
          <p>Request approval for business travel</p>
        </div>
      </div>

      <TravelForm onCancel={() => router.push("/travel")} />
    </div>
  )
}
