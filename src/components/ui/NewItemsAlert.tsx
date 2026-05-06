"use client"

import { AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface NewItemsAlertProps {
  requestsCount?: number
  tasksCount?: number
  variant?: "icon" | "badge" | "inline"
  className?: string
}

export function NewItemsAlert({
  requestsCount = 0,
  tasksCount = 0,
  variant = "icon",
  className,
}: NewItemsAlertProps) {
  const totalNew = requestsCount + tasksCount

  if (totalNew === 0) return null

  if (variant === "icon") {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <AlertCircle className="h-5 w-5 text-red-500 animate-pulse flex-shrink-0" />
      </div>
    )
  }

  if (variant === "badge") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex gap-2 text-xs">
          {requestsCount > 0 && (
            <span className="bg-red-500 text-white px-2 py-1 rounded-full font-semibold">
              {requestsCount} new request{requestsCount !== 1 ? "s" : ""}
            </span>
          )}
          {tasksCount > 0 && (
            <span className="bg-orange-500 text-white px-2 py-1 rounded-full font-semibold">
              {tasksCount} new task{tasksCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
    )
  }

  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg", className)}>
        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
        <div className="text-sm text-red-900 font-medium">
          {totalNew} new item{totalNew !== 1 ? "s" : ""} pending
          {requestsCount > 0 && tasksCount > 0 && " (requests and tasks)"}
          {requestsCount > 0 && tasksCount === 0 && " (requests)"}
          {requestsCount === 0 && tasksCount > 0 && " (tasks)"}
        </div>
      </div>
    )
  }

  return null
}
