"use client"

import { useState } from "react"
import { Check, ChevronDown, Lock, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  onStatusChange: (newStatus: string) => void | Promise<void>
  requestId?: string
  disabled?: boolean
  canUpdateStatus?: boolean
  disabledStatuses?: readonly string[]
}

export function InlineStatusSelect({
  currentStatus,
  statuses,
  statusColors,
  statusDot,
  statusLabels,
  onStatusChange,
  requestId,
  disabled = false,
  canUpdateStatus = true,
  disabledStatuses = [],
}: InlineStatusSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false)

  function showApprovedRequestDialog() {
    setIsOpen(false)
    setApprovalDialogOpen(true)
  }

  async function handleSelect(status: string) {
    // Shared live check for every queue. A module page can have an older list
    // snapshot, but an approved request must still show the same protected
    // approval modal instead of entering the status-update flow.
    if (status === "awaiting_approval" && requestId) {
      try {
        const response = await fetch(`/api/requests?id=${encodeURIComponent(requestId)}`, { cache: "no-store" })
        if (response.ok) {
          const { request } = await response.json()
          const approved = Array.isArray(request?.statusHistory) && request.statusHistory.some((entry: { comment?: string | null }) =>
            /^Approved by (Direct|Authorized) Manager/i.test(entry.comment ?? "")
          )
          if (approved) {
            showApprovedRequestDialog()
            return
          }
        }
      } catch {
        // The server remains the final guard; continue with the normal flow
        // only when the live check is unavailable.
      }
    }
    if (disabledStatuses.includes(status)) {
      showApprovedRequestDialog()
      return
    }
    if (status !== currentStatus) {
      try {
        await onStatusChange(status)
      } catch (error) {
        const message = error instanceof Error ? error.message : "Status update failed"
        if (/already been approved|cannot return to Awaiting Approval/i.test(message)) {
          showApprovedRequestDialog()
        }
      }
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
          const statusDisabled = disabledStatuses.includes(status)

          return (
            <div
              key={status}
              title={statusDisabled ? "This request has already been approved and cannot return to Awaiting Approval." : undefined}
              className={statusDisabled ? "cursor-not-allowed" : undefined}
            >
            <DropdownMenuItem
              aria-disabled={statusDisabled}
              onSelect={() => { void handleSelect(status) }}
              className={cn(
                "flex items-center gap-3 rounded-none border-b px-4 py-3 text-sm transition-colors last:border-b-0",
                statusDisabled ? "cursor-not-allowed bg-gray-100 text-gray-400 opacity-70" : "cursor-pointer focus:bg-gray-100",
                isActive && !statusDisabled && "bg-blue-100 focus:bg-blue-100"
              )}
            >
              <span className={cn("h-2 w-2 rounded-full shrink-0", statusDisabled ? "bg-gray-400" : statusDot[status] ?? "bg-gray-400")} />
              <span className={cn("font-medium", statusDisabled ? "text-gray-400" : "text-gray-900")}>{statusLabel}</span>
              {statusDisabled && (
                <span className="ml-auto max-w-28 text-right text-[10px] leading-tight text-gray-400">
                  This request has already been approved
                </span>
              )}
              {isActive && <Check className="ml-auto h-4 w-4 text-blue-600" />}
            </DropdownMenuItem>
            </div>
          )
        })}
      </DropdownMenuContent>
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent className="max-w-md border-amber-200 p-0">
          <DialogHeader className="rounded-t-lg border-b border-amber-100 bg-amber-50 px-6 py-5 text-left">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-amber-100 p-2 text-amber-700"><ShieldCheck className="h-5 w-5" /></div>
              <DialogTitle className="text-base text-amber-950">Approval already completed</DialogTitle>
            </div>
          </DialogHeader>
          <DialogDescription className="px-6 pt-5 text-sm leading-6 text-slate-600">
            This request has already been approved and cannot return to Awaiting Approval. Its status remains In Progress.
          </DialogDescription>
          <DialogFooter className="px-6 pb-6 pt-2">
            <Button type="button" onClick={() => setApprovalDialogOpen(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DropdownMenu>
  )
}
