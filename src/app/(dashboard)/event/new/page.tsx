"use client"

import { useRouter } from "next/navigation"
import { EventForm } from "@/modules/event/EventForm"

export default function NewEventRequestPage() {
  const router = useRouter()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Event Request</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Plan and request a new event or meeting
        </p>
      </div>

      {/* Form */}
      <EventForm onCancel={() => router.push("/event")} />
    </div>
  )
}
