"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface ScheduledMaintenance {
  enabled: boolean
  startTime: string
  endTime: string
  announcementMessage: string
}

export function ScheduledMaintenanceBanner() {
  const [maintenance, setMaintenance] = useState<ScheduledMaintenance | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [isUpcoming, setIsUpcoming] = useState(false)

  useEffect(() => {
    const fetchMaintenance = async () => {
      try {
        const res = await fetch("/api/admin/maintenance")
        if (res.ok) {
          const data = await res.json()
          if (data.scheduledMaintenance?.enabled) {
            setMaintenance(data.scheduledMaintenance)
            const startTime = new Date(data.scheduledMaintenance.startTime)
            const now = new Date()
            const hoursUntil = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60)
            setIsUpcoming(hoursUntil > 0 && hoursUntil <= 72) // Show banner if within 72 hours
          }
        }
      } catch (error) {
        console.error("Failed to fetch maintenance schedule:", error)
      }
    }

    fetchMaintenance()
    // Check every 5 minutes for changes
    const interval = setInterval(fetchMaintenance, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (!maintenance || !isUpcoming || dismissed) return null

  const startTime = new Date(maintenance.startTime)
  const endTime = new Date(maintenance.endTime)

  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    })
  }

  const durationHours = Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60))

  return (
    <div className="sticky top-0 z-50 border-b-2 border-amber-400 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 px-4 py-4">
      <div className="max-w-7xl mx-auto flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-300 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-amber-900 dark:text-amber-100">
            Scheduled Maintenance Notice
          </h3>
          <div className="mt-2 space-y-1 text-sm text-amber-800 dark:text-amber-200">
            <p className="font-medium">{maintenance.announcementMessage}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <div>
                <span className="opacity-75">Starts: </span>
                <span className="font-medium">{formatDateTime(startTime)}</span>
              </div>
              <div>
                <span className="opacity-75">Duration: </span>
                <span className="font-medium">~{durationHours} hour{durationHours !== 1 ? "s" : ""}</span>
              </div>
            </div>
            <p className="text-xs opacity-75 mt-2">
              During this time, the system will be temporarily unavailable. We apologize for any inconvenience.
            </p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 mt-0.5"
          aria-label="Dismiss notification"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
