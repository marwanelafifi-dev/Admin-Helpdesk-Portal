"use client"

import { MoreHorizontal, ChevronDown, ChevronUp, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface RequestActionsMenuProps {
  requestId: string
  showCancelOption?: boolean
  /** When true, a red "Delete permanently" item is added to the bottom of
   *  the menu. Admin-only — the caller should gate on Full Access or the
   *  `manage_users` permission before passing this prop. */
  showDeleteOption?: boolean
  isExpanded?: boolean
  onViewDetails?: (id: string) => void
  onEdit?: (id: string) => void
  onCancel?: (id: string) => void
  onDelete?: (id: string) => void
  disabled?: boolean
}

export function RequestActionsMenu({
  requestId,
  showCancelOption = false,
  showDeleteOption = false,
  isExpanded = false,
  onViewDetails,
  onEdit,
  onCancel,
  onDelete,
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
        {showDeleteOption && onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(requestId)}
              className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30"
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Delete permanently
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
