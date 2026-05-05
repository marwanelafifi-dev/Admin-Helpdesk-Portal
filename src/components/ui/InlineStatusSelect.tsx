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
        onClick={() => {
          if (canUpdateStatus && !disabled) {
            setIsOpen(!isOpen)
          }
        }}
        disabled={disabled || !canUpdateStatus}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold whitespace-nowrap",
          "transition-all",
          canUpdateStatus && !disabled && "hover:ring-2 hover:ring-offset-1 cursor-pointer",
          !canUpdateStatus && "cursor-not-allowed",
          color
        )}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dot)} />
        <span>{label}</span>
        {canUpdateStatus && !disabled ? (
          <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", isOpen && "rotate-180")} />
        ) : (
          <Lock className="h-3 w-3 text-gray-400" />
        )}
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-full mt-2 bg-white border-2 border-gray-300 rounded-lg shadow-2xl overflow-y-auto max-h-64 z-50"
          style={{ minWidth: '200px' }}
          onClick={(e) => e.stopPropagation()}
        >
          {statuses.map((status) => {
            const statusLabel = statusLabels[status] ?? status
            const isActive = status === currentStatus

            return (
              <button
                key={status}
                onClick={() => handleSelect(status)}
                className={cn(
                  "w-full text-left px-4 py-3 text-sm flex items-center gap-3 transition-colors border-b last:border-b-0",
                  isActive ? "bg-blue-100 hover:bg-blue-150" : "hover:bg-gray-100"
                )}
              >
                <span className={cn("h-2 w-2 rounded-full shrink-0", statusDot[status] ?? "bg-gray-400")} />
                <span className="text-gray-900 font-medium">{statusLabel}</span>
                {isActive && <span className="text-blue-600 font-bold ml-auto">✓</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
