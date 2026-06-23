"use client"

import { useEffect, useState } from "react"
import { AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface ScheduledMaintenance {
  enabled: boolean
  startTime: string
  endTime: string
  announcementMessage: string
}

export function ScheduledMaintenanceBanner() {
  const [maintenance, setMaintenance] = useState<ScheduledMaintenance | null>(null)
  const [isUpcoming, setIsUpcoming] = useState(false)

  useEffect(() => {
    const fetchMaintenance = async () => {
      try {
        // Try authenticated endpoint first (more up-to-date)
        let data = null
        try {
          const res = await fetch("/api/admin/maintenance")
          if (res.ok) {
            data = await res.json()
          }
        } catch {
          // Fall back to public endpoint if admin endpoint fails or requires auth
          const res = await fetch("/api/maintenance/scheduled")
          if (res.ok) {
            data = await res.json()
          }
        }

        if (data?.scheduledMaintenance?.enabled) {
          setMaintenance(data.scheduledMaintenance)
          const startTime = new Date(data.scheduledMaintenance.startTime)
          const now = new Date()
          const hoursUntil = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60)
          setIsUpcoming(hoursUntil > 0 && hoursUntil <= 72) // Show banner if within 72 hours
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

  if (!maintenance || !isUpcoming) return null

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
    <div className="sticky top-0 z-50 border-b border-amber-300 dark:border-amber-700 bg-amber-100 dark:bg-amber-900 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-300 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-amber-800 dark:text-amber-200">
            <span className="inline-block">Scheduled Maintenance:</span>
            <span className="mx-1">{maintenance.announcementMessage}</span>
            <span className="mx-1">|</span>
            <span className="inline-block">Starts: {formatDateTime(startTime)}</span>
            <span className="mx-1">|</span>
            <span className="inline-block">Duration: ~{durationHours}h</span>
          </div>
        </div>
      </div>
    </div>
  )
}
