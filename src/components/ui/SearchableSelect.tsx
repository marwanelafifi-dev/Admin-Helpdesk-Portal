"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
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
  pinnedOption?: {
    value: string
    label: string
    caption?: string
  }
}

/** Highlight the matching portion of a string with a bold/colored span. */
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300 rounded-sm font-semibold not-italic">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
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
  const [activeIdx, setActiveIdx] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  // Focus input & reset state when opening
  useEffect(() => {
    if (open) {
      setQuery("")
      setActiveIdx(-1)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  // Deduplicate + filter
  const filtered = useMemo(() => {
    const pinVal = pinnedOption?.value
    // Deduplicate case-insensitively, keeping first occurrence
    const seen = new Set<string>()
    const unique = options.filter((o) => {
      if (o === pinVal) return false
      const key = o.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    const q = query.trim().toLowerCase()
    if (!q) return unique
    // Sort: starts-with first, then contains
    const startsWith: string[] = []
    const contains: string[] = []
    unique.forEach((o) => {
      const lower = o.toLowerCase()
      if (lower.startsWith(q)) startsWith.push(o)
      else if (lower.includes(q)) contains.push(o)
    })
    return [...startsWith, ...contains]
  }, [options, query, pinnedOption])

  const pinnedVisible = useMemo(() => {
    if (!pinnedOption) return false
    const q = query.trim().toLowerCase()
    if (!q) return true
    return (
      pinnedOption.label.toLowerCase().includes(q) ||
      pinnedOption.value.toLowerCase().includes(q)
    )
  }, [pinnedOption, query])

  // All navigable items: pinned first (if visible), then filtered list
  const navigable = useMemo(() => {
    const items: string[] = []
    if (pinnedOption && pinnedVisible) items.push(pinnedOption.value)
    items.push(...filtered)
    return items
  }, [filtered, pinnedOption, pinnedVisible])

  const select = useCallback((val: string) => {
    onChange(val)
    setOpen(false)
    setQuery("")
  }, [onChange])

  // Scroll active item into view
  useEffect(() => {
    if (!open || activeIdx < 0) return
    const el = listRef.current?.querySelector(`[data-idx="${activeIdx}"]`) as HTMLElement | null
    el?.scrollIntoView({ block: "nearest" })
  }, [activeIdx, open])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault()
        setOpen(true)
      }
      return
    }
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, navigable.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (activeIdx >= 0 && navigable[activeIdx]) select(navigable[activeIdx])
    } else if (e.key === "Escape") {
      setOpen(false)
    } else if (e.key === "Tab") {
      setOpen(false)
    }
  }

  const isEmpty = filtered.length === 0 && !pinnedVisible

  return (
    <div ref={wrapperRef} className={cn("relative", className)} onKeyDown={onKeyDown}>
      {/* Trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          open && "ring-2 ring-ring ring-offset-2",
          hasError && "border-red-400 focus:ring-red-400",
          !value && "text-muted-foreground"
        )}
      >
        <span className="truncate text-left flex-1">{value || placeholder}</span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {allowClear && value && !disabled && (
            <X
              className="h-3.5 w-3.5 opacity-50 hover:opacity-100 transition-opacity"
              onClick={(e) => { e.stopPropagation(); onChange("") }}
            />
          )}
          <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform duration-150", open && "rotate-180")} />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[200px] rounded-lg border bg-popover text-popover-foreground shadow-lg overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/40">
            <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActiveIdx(0) }}
              placeholder="Type to search…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(""); setActiveIdx(-1) }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Options list */}
          <div ref={listRef} className="max-h-60 overflow-y-auto py-1">
            {isEmpty ? (
              <div className="flex flex-col items-center gap-1 py-8 text-center">
                <Search className="h-5 w-5 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No results for "{query}"</p>
                <p className="text-xs text-muted-foreground/60">Try a different search term</p>
              </div>
            ) : (
              <>
                {/* Pinned option */}
                {pinnedOption && pinnedVisible && (() => {
                  const idx = navigable.indexOf(pinnedOption.value)
                  const isActive = activeIdx === idx
                  return (
                    <div className="border-b border-blue-100 dark:border-blue-900/40 mb-1">
                      <button
                        type="button"
                        data-idx={idx}
                        onClick={() => select(pinnedOption.value)}
                        onMouseEnter={() => setActiveIdx(idx)}
                        className={cn(
                          "flex w-full items-center gap-2.5 px-3 py-2 text-sm text-left",
                          "text-blue-700 dark:text-blue-300 font-medium",
                          isActive
                            ? "bg-blue-100 dark:bg-blue-900/40"
                            : "hover:bg-blue-50 dark:hover:bg-blue-950/30",
                          pinnedOption.value === value && "bg-blue-50 dark:bg-blue-950/20"
                        )}
                      >
                        <Plus className="h-3.5 w-3.5 flex-shrink-0 text-blue-500" />
                        <span className="flex-1 truncate">
                          <Highlight text={pinnedOption.label} query={query} />
                        </span>
                        {pinnedOption.value === value && <Check className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />}
                      </button>
                      {pinnedOption.caption && (
                        <p className="px-3 pb-1.5 text-[11px] italic text-blue-500/70 dark:text-blue-400/60">
                          {pinnedOption.caption}
                        </p>
                      )}
                    </div>
                  )
                })()}

                {/* Regular options */}
                {filtered.map((opt) => {
                  const idx = navigable.indexOf(opt)
                  const isActive = activeIdx === idx
                  const isSelected = opt === value
                  return (
                    <button
                      type="button"
                      key={opt}
                      data-idx={idx}
                      onClick={() => select(opt)}
                      onMouseEnter={() => setActiveIdx(idx)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 px-3 py-1.5 text-sm text-left transition-colors",
                        isActive && "bg-accent text-accent-foreground",
                        isSelected && !isActive && "bg-accent/40",
                        !isActive && !isSelected && "hover:bg-accent/60 hover:text-accent-foreground"
                      )}
                    >
                      <span className="truncate flex-1">
                        <Highlight text={opt} query={query} />
                      </span>
                      {isSelected && <Check className="h-3.5 w-3.5 flex-shrink-0 text-primary" />}
                    </button>
                  )
                })}
              </>
            )}
          </div>

          {/* Footer count */}
          {!isEmpty && (
            <div className="border-t px-3 py-1.5 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                {query
                  ? `${filtered.length} result${filtered.length !== 1 ? "s" : ""} for "${query}"`
                  : `${filtered.length} option${filtered.length !== 1 ? "s" : ""}`}
              </span>
              {value && (
                <span className="text-[10px] text-primary font-medium truncate max-w-[120px]">
                  ✓ {value}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SearchableSelect
