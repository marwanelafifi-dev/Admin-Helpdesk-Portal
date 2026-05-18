"use client"

import { MoreHorizontal, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface RequestActionsMenuProps {
  requestId: string
  showCancelOption?: boolean
  isExpanded?: boolean
  onViewDetails?: (id: string) => void
  onEdit?: (id: string) => void
  onCancel?: (id: string) => void
  disabled?: boolean
}

export function RequestActionsMenu({
  requestId,
  showCancelOption = false,
  isExpanded = false,
  onViewDetails,
  onEdit,
  onCancel,
  disabled = false,
}: RequestActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-gray-400 hover:text-gray-600"
          disabled={disabled}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onViewDetails && (
          <DropdownMenuItem onClick={() => onViewDetails(requestId)} className="flex items-center justify-between">
            <span>View details</span>
            {isExpanded && <ChevronUp className="h-3.5 w-3.5 ml-2" />}
            {!isExpanded && <ChevronDown className="h-3.5 w-3.5 ml-2" />}
          </DropdownMenuItem>
        )}
        {onEdit && (
          <DropdownMenuItem onClick={() => onEdit(requestId)}>
            Edit
          </DropdownMenuItem>
        )}
        {showCancelOption && onCancel && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onCancel(requestId)}
              className="text-destructive focus:text-destructive"
            >
              Cancel request
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
