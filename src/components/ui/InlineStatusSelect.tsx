"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, Lock } from "lucide-react"
import { cn } from "@/lib/utils"

interface InlineStatusSelectProps {
  currentStatus: string
  statuses: readonly string[]
  statusColors: Record<string, string>
  statusDot: Record<string, string>
  statusLabels: Record<string, string>
  onStatusChange: (newStatus: string) => void
  disabled?: boolean
  canUpdateStatus?: boolean
}

export function InlineStatusSelect({
  currentStatus,
  statuses,
  statusColors,
  statusDot,
  statusLabels,
  onStatusChange,
  disabled = false,
  canUpdateStatus = true,
}: InlineStatusSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [openUpward, setOpenUpward] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      // Check if dropdown would go off-screen and flip upward if needed
      if (ref.current && dropdownRef.current) {
        const rect = ref.current.getBoundingClientRect()
        const dropdownHeight = dropdownRef.current.offsetHeight
        const spaceBelow = window.innerHeight - rect.bottom
        const spaceAbove = rect.top

        // Flip upward if not enough space below and more space above
        setOpenUpward(spaceBelow < dropdownHeight && spaceAbove > spaceBelow)
      }
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
        onClick={() => canUpdateStatus && !disabled && setIsOpen(!isOpen)}
        disabled={disabled || !canUpdateStatus}
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap",
          "transition-all",
          canUpdateStatus && !disabled && "hover:ring-2 hover:ring-offset-1 cursor-pointer",
          !canUpdateStatus && "cursor-not-allowed",
          color
        )}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dot)} />
        <span>{label}</span>
        {canUpdateStatus && !disabled ? (
          <ChevronDown className={cn("h-3 w-3 transition-transform", isOpen && "rotate-180")} />
        ) : (
          <Lock className="h-3 w-3 text-gray-400" />
        )}
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className={cn(
            "absolute left-0 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-max max-h-72 overflow-y-auto",
            openUpward ? "bottom-full mb-1" : "top-full mt-1"
          )}
        >
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
