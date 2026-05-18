"use client"

import { useState } from "react"
import { Check, ChevronDown, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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

  function handleSelect(status: string) {
    if (status !== currentStatus) {
      onStatusChange(status)
    }
    setIsOpen(false)
  }

  const label = statusLabels[currentStatus] ?? currentStatus
  const color = statusColors[currentStatus] ?? "bg-zinc-100 text-zinc-600"
  const dot = statusDot[currentStatus] ?? "bg-gray-400"
  const isDisabled = disabled || !canUpdateStatus

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild disabled={isDisabled}>
        <button
          disabled={isDisabled}
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold whitespace-nowrap",
            "transition-all",
            !isDisabled && "hover:ring-2 hover:ring-offset-1 cursor-pointer",
            isDisabled && "cursor-not-allowed",
            color
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dot)} />
          <span>{label}</span>
          {!isDisabled ? (
            <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", isOpen && "rotate-180")} />
          ) : (
            <Lock className="h-3 w-3 text-gray-400" />
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        side="bottom"
        sideOffset={8}
        collisionPadding={12}
        className="z-[100] max-h-64 min-w-[200px] overflow-y-auto rounded-lg border-2 border-gray-300 bg-white p-0 shadow-2xl"
      >
        {statuses.map((status) => {
          const statusLabel = statusLabels[status] ?? status
          const isActive = status === currentStatus

          return (
            <DropdownMenuItem
              key={status}
              onSelect={() => handleSelect(status)}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-none border-b px-4 py-3 text-sm transition-colors last:border-b-0 focus:bg-gray-100",
                isActive && "bg-blue-100 focus:bg-blue-100"
              )}
            >
              <span className={cn("h-2 w-2 rounded-full shrink-0", statusDot[status] ?? "bg-gray-400")} />
              <span className="font-medium text-gray-900">{statusLabel}</span>
              {isActive && <Check className="ml-auto h-4 w-4 text-blue-600" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
