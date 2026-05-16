"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronDown, LayoutList } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ViewDefinition {
  id: string
  label: string
  description?: string
  filters: {
    status?: string
    module?: string
  }
}

interface ViewGroup {
  label: string
  views: ViewDefinition[]
}

interface ViewSelectorProps {
  groups: ViewGroup[]
  activeViewId: string
  onSelect: (view: ViewDefinition) => void
}

export function ViewSelector({ groups, activeViewId, onSelect }: ViewSelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  const activeView = groups.flatMap((g) => g.views).find((v) => v.id === activeViewId)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch("")
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const filteredGroups = groups
    .map((g) => ({
      ...g,
      views: g.views.filter((v) =>
        v.label.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter((g) => g.views.length > 0)

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => { setOpen((o) => !o); setSearch("") }}
        className="flex items-center gap-2 group"
      >
        <LayoutList className="h-5 w-5 text-muted-foreground shrink-0" />
        <span className="text-2xl font-bold tracking-tight text-gray-900 group-hover:text-blue-700 transition-colors">
          {activeView?.label ?? "All Requests"}
        </span>
        <ChevronDown className={cn(
          "h-5 w-5 text-muted-foreground mt-0.5 transition-transform",
          open && "rotate-180"
        )} />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-2 w-72 bg-white border rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search views..."
              className="w-full text-sm px-3 py-1.5 rounded-md border bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="max-h-72 overflow-y-auto py-1">
            {filteredGroups.length === 0 && (
              <p className="px-4 py-3 text-sm text-muted-foreground">No views found</p>
            )}
            {filteredGroups.map((group) => (
              <div key={group.label}>
                <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {group.label}
                </p>
                {group.views.map((view) => (
                  <button
                    key={view.id}
                    onClick={() => { onSelect(view); setOpen(false); setSearch("") }}
                    className={cn(
                      "w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition-colors flex items-center justify-between gap-2",
                      activeViewId === view.id && "bg-blue-50 text-blue-700 font-semibold"
                    )}
                  >
                    <span>{view.label}</span>
                    {activeViewId === view.id && (
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
