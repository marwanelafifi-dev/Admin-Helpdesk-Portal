'use client'

import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-zinc-100 text-zinc-800' },
  new: { label: 'New', color: 'bg-sky-100 text-sky-800' },
  on_hold: { label: 'On Hold', color: 'bg-amber-100 text-amber-800' },
  in_customs: { label: 'In Customs', color: 'bg-amber-100 text-amber-800' },
  in_transit: { label: 'In Transit', color: 'bg-blue-100 text-blue-800' },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-800' },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
  pending_assignment: { label: 'Pending Assignment', color: 'bg-purple-100 text-purple-800' },
  assigned: { label: 'Assigned', color: 'bg-indigo-100 text-indigo-800' },
  awaiting_input: { label: 'Awaiting Input', color: 'bg-orange-100 text-orange-800' },
  resolved: { label: 'Resolved', color: 'bg-teal-100 text-teal-800' },
  closed: { label: 'Closed', color: 'bg-gray-100 text-gray-800' },
} as const

export type RequestStatus = keyof typeof STATUS_CONFIG

interface StatusDropdownProps {
  currentStatus: RequestStatus
  onStatusChange: (status: RequestStatus) => Promise<void>
  disabled?: boolean
  compact?: boolean
  adminOnly?: boolean
}

export function StatusDropdown({
  currentStatus,
  onStatusChange,
  disabled = false,
  compact = false,
  adminOnly = true,
}: StatusDropdownProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const currentConfig = STATUS_CONFIG[currentStatus]

  const handleStatusChange = async (newStatus: RequestStatus) => {
    if (isLoading || disabled) return

    setIsLoading(true)
    try {
      await onStatusChange(newStatus)
      setOpen(false)
    } catch (error) {
      console.error('Failed to update status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!adminOnly) {
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${currentConfig.color}`}>
        {currentConfig.label}
      </span>
    )
  }

  if (compact) {
    return (
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`text-xs font-medium ${currentConfig.color} ${
              isLoading ? 'opacity-50 cursor-wait' : ''
            }`}
            disabled={disabled || isLoading}
          >
            {currentConfig.label}
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Change Status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <DropdownMenuItem
              key={key}
              onClick={() => handleStatusChange(key as RequestStatus)}
              className={`cursor-pointer ${currentStatus === key ? 'bg-blue-50' : ''}`}
            >
              <span className={`px-2 py-0.5 rounded text-xs font-medium mr-2 ${config.color}`}>
                {config.label}
              </span>
              {currentStatus === key && <Check className="h-4 w-4 ml-auto" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={`text-sm font-medium ${currentConfig.color} border-2 ${
            isLoading ? 'opacity-50 cursor-wait' : ''
          }`}
          disabled={disabled || isLoading}
        >
          {currentConfig.label}
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-base font-semibold">Change Status</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
          <DropdownMenuItem
            key={key}
            onClick={() => handleStatusChange(key as RequestStatus)}
            className={`cursor-pointer py-2 ${currentStatus === key ? 'bg-blue-50' : ''}`}
          >
            <span className={`px-3 py-1 rounded-lg text-sm font-medium ${config.color}`}>
              {config.label}
            </span>
            {currentStatus === key && <Check className="h-5 w-5 ml-auto text-blue-600" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
