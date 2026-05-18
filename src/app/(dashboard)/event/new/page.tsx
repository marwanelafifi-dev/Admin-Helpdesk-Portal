"use client"

import { useRouter } from "next/navigation"
import { EventForm } from "@/modules/event/EventForm"
import { CalendarDays } from "lucide-react"

export default function NewEventRequestPage() {
  const router = useRouter()

  return (
    <div className="request-page space-y-6">
      <div className="request-page-header">
        <div className="request-page-header-icon">
          <CalendarDays className="h-5 w-5" />
        </div>
        <div>
          <h1>New Event Request</h1>
          <p>Plan and request a new event or meeting</p>
        </div>
      </div>

      <EventForm onCancel={() => router.push("/event")} />
    </div>
  )
}
