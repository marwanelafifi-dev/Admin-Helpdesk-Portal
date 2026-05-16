"use client"

import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { ChevronDown, X, UserPlus } from "lucide-react"
import type { Approver } from "@/lib/approvers-api"

interface ApproverComboboxProps {
  value: string
  onChange: (value: string) => void
  approvers: Approver[]
  placeholder?: string
  hasError?: boolean
}

export function ApproverCombobox({
  value,
  onChange,
  approvers,
  placeholder,
  hasError,
}: ApproverComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = approvers.find((a) => a.id === value)
  const displayValue = selected
    ? `${selected.name} (${selected.email})`
    : value?.includes("@")
    ? value
    : ""

  const filtered = approvers.filter((a) => {
    const q = query.toLowerCase()
    return a.name?.toLowerCase().includes(q) || a.email?.toLowerCase().includes(q)
  })

  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(query)
  const isExactMatch = approvers.some(
    (a) => a.email?.toLowerCase() === query.toLowerCase()
  )
  const showAddOption = isEmail && !isExactMatch

  function handleSelect(approver: Approver) {
    onChange(approver.id)
    setQuery("")
    setOpen(false)
  }

  function handleAddEmail() {
    onChange(query)
    setQuery("")
    setOpen(false)
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange("")
    setQuery("")
    setOpen(false)
  }

  function handleFocus() {
    setQuery("")
    setOpen(true)
  }

  function handleBlur() {
    // Small delay to allow click on dropdown items
    setTimeout(() => setOpen(false), 150)
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          "flex items-center border rounded-md bg-white overflow-hidden",
          hasError && "border-red-400",
          open && "ring-2 ring-ring ring-offset-0 border-ring"
        )}
      >
        <Input
          value={open ? query : displayValue}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder || "Search name or type email..."}
          className="border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 flex-1 text-sm"
        />
        {value ? (
          <button
            type="button"
            onMouseDown={handleClear}
            className="pr-3 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <ChevronDown className="h-4 w-4 mr-3 text-muted-foreground shrink-0" />
        )}
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-52 overflow-y-auto">
          {filtered.length === 0 && !showAddOption && (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              No users found. Type a full email to add manually.
            </p>
          )}

          {filtered.map((approver) => (
            <button
              key={approver.id}
              type="button"
              onMouseDown={() => handleSelect(approver)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex flex-col"
            >
              <span className="font-medium text-gray-800">{approver.name}</span>
              <span className="text-xs text-muted-foreground">{approver.email}</span>
            </button>
          ))}

          {showAddOption && (
            <button
              type="button"
              onMouseDown={handleAddEmail}
              className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 border-t flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4 shrink-0" />
              Add <span className="font-medium">{query}</span> as approver
            </button>
          )}
        </div>
      )}
    </div>
  )
}
