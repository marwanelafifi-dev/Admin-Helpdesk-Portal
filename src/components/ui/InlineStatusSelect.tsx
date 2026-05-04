"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface InlineStatusSelectProps {
  currentStatus: string
  statuses: readonly string[]
  statusColors: Record<string, string>
  statusDot: Record<string, string>
  statusLabels: Record<string, string>
  onStatusChange: (newStatus: string) => void
  disabled?: boolean
}

export function InlineStatusSelect({
  currentStatus,
  statuses,
  statusColors,
  statusDot,
  statusLabels,
  onStatusChange,
  disabled = false,
}: InlineStatusSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  function handleSelect(status: string) {
    if (status !== currentStatus) {
      onStatusChange(status)
    }
    setIsOpen(false)
  }

  const label = statusLabels[currentStatus] ?? currentStatus
  const color = statusColors[currentStatus] ?? "bg-zinc-100 text-zinc-600"
  const dot = statusDot[currentStatus] ?? "bg-gray-400"

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap",
          "transition-all hover:ring-2 hover:ring-offset-1 cursor-pointer",
          color,
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dot)} />
        <span>{label}</span>
        <ChevronDown className={cn("h-3 w-3 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1 left-0 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-max">
          {statuses.map((status) => {
            const statusLabel = statusLabels[status] ?? status
            const statusColor = statusColors[status] ?? "bg-zinc-100 text-zinc-600"
            const isActive = status === currentStatus

            return (
              <button
                key={status}
                onClick={() => handleSelect(status)}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-100",
                  "border-b last:border-b-0 transition-colors",
                  isActive && "bg-blue-50"
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", statusDot[status] ?? "bg-gray-400")} />
                <span className="flex-1">{statusLabel}</span>
                {isActive && <span className="text-blue-600 font-semibold">✓</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
