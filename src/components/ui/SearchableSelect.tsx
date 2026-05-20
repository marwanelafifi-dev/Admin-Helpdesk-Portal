"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Check, ChevronDown, Plus, Search, X } from "lucide-react"
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
  /**
   * Optional pinned entry shown at the very top of the dropdown, styled in
   * blue to draw attention. Used for "Other" so users can add a new value
   * without scrolling past a long list of existing options.
   */
  pinnedOption?: {
    value: string
    label: string
    caption?: string
  }
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
  pinnedOption,
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
    // Strip the pinned option from the regular list so it doesn't render twice.
    const base = pinnedOption ? options.filter((o) => o !== pinnedOption.value) : options
    const q = query.trim().toLowerCase()
    if (!q) return base
    return base.filter((o) => o.toLowerCase().includes(q))
  }, [options, query, pinnedOption])

  // Pinned option matches the search query (or no query) so it stays visible.
  const pinnedVisible = useMemo(() => {
    if (!pinnedOption) return false
    const q = query.trim().toLowerCase()
    if (!q) return true
    return pinnedOption.label.toLowerCase().includes(q) || pinnedOption.value.toLowerCase().includes(q)
  }, [pinnedOption, query])

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
            {pinnedOption && pinnedVisible && (
              <>
                <button
                  type="button"
                  onClick={() => { onChange(pinnedOption.value); setOpen(false) }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-sm text-left border-l-2 border-blue-500",
                    "bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100",
                    "dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/40",
                    pinnedOption.value === value && "ring-1 ring-inset ring-blue-300"
                  )}
                >
                  <Plus className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate flex-1">{pinnedOption.label}</span>
                  {pinnedOption.value === value && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                </button>
                {pinnedOption.caption && (
                  <p className="px-3 pt-1 pb-1.5 text-[11px] italic text-blue-600/80 dark:text-blue-400/80 border-b border-blue-100 dark:border-blue-900/50">
                    {pinnedOption.caption}
                  </p>
                )}
              </>
            )}
            {filtered.length === 0 && !pinnedVisible ? (
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
