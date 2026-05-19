"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Check, ChevronDown, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface SearchableSelectProps {
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
  className?: string
  disabled?: boolean
  hasError?: boolean
  allowClear?: boolean
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  className,
  disabled,
  hasError,
  allowClear,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [open])

  useEffect(() => {
    if (open) {
      setQuery("")
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.toLowerCase().includes(q))
  }, [options, query])

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          hasError && "border-red-400",
          !value && "text-muted-foreground"
        )}
      >
        <span className="truncate text-left flex-1">{value || placeholder}</span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {allowClear && value && !disabled && (
            <X
              className="h-3.5 w-3.5 opacity-60 hover:opacity-100"
              onClick={(e) => { e.stopPropagation(); onChange("") }}
            />
          )}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </div>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
          <div className="flex items-center gap-2 border-b px-2.5 py-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">No matches</div>
            ) : (
              filtered.map((opt) => (
                <button
                  type="button"
                  key={opt}
                  onClick={() => { onChange(opt); setOpen(false) }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground text-left",
                    opt === value && "bg-accent/50"
                  )}
                >
                  <span className="truncate">{opt}</span>
                  {opt === value && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                </button>
              ))
            )}
          </div>
          <div className="border-t px-3 py-1.5 text-[10px] text-muted-foreground">
            {filtered.length} of {options.length}
          </div>
        </div>
      )}
    </div>
  )
}

export default SearchableSelect
