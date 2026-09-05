"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Check, ChevronDown, Search, UserCircle2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface AdminUser {
  id: string
  name: string
  email: string
  image?: string | null
  role?: string
}

interface AssigneeSelectProps {
  /** Currently assigned user's id (or null/undefined for "Unassigned"). */
  value: string | null | undefined
  /** Called with the picked user, or null when the assignee is cleared. */
  onChange: (assignee: AdminUser | null) => void
  /** Disable interaction (no permission, etc.). */
  disabled?: boolean
  /** Render in a compact pill style suitable for table cells. */
  compact?: boolean
  className?: string
  /**
   * The request's module — determines which team's members are offered as
   * assignees (e.g. "hr" / "hr_general" -> People Team). Omit for the
   * default Administration Team pool.
   */
  module?: string
}

// Which endpoint supplies the assignable-user pool for a given request
// module. Add an entry here once a new function's requests need their own
// assignee pool (e.g. a future Finance module -> "/api/users/finance-team").
// "hr" (Onboarding/Offboarding) is deliberately NOT here — Administration
// Team executes those operational items, so it uses the default pool below.
const MODULE_ASSIGNEE_ENDPOINT: Record<string, string> = {
  hr_general: "/api/users/hr-team",
  hr_letter: "/api/users/hr-team",
  finance_reimbursement: "/api/users/finance-team",
}
const MODULE_TEAM_LABEL: Record<string, string> = {
  hr_general: "People Team",
  hr_letter: "People Team",
  finance_reimbursement: "Finance Team",
}
const DEFAULT_ASSIGNEE_ENDPOINT = "/api/users/admin-team"
const DEFAULT_TEAM_LABEL = "Administration Team"

function initials(name?: string, email?: string): string {
  const label = name || email || "?"
  return label
    .split(/[.\s@_-]+/)
    .filter(Boolean)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2) || "?"
}

const assigneeCache = new Map<string, { list: AdminUser[]; at: number }>()
const CACHE_TTL = 60_000

async function fetchAssignees(endpoint: string): Promise<AdminUser[]> {
  const now = Date.now()
  const cached = assigneeCache.get(endpoint)
  if (cached && now - cached.at < CACHE_TTL) return cached.list
  try {
    const res = await fetch(endpoint)
    const json = await res.json()
    const list = Array.isArray(json?.data) ? json.data : []
    assigneeCache.set(endpoint, { list, at: now })
    return list
  } catch {
    return cached?.list ?? []
  }
}

export function AssigneeSelect({ value, onChange, disabled, compact, className, module }: AssigneeSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [loaded, setLoaded] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const endpoint = (module && MODULE_ASSIGNEE_ENDPOINT[module]) || DEFAULT_ASSIGNEE_ENDPOINT
  const teamLabel = (module && MODULE_TEAM_LABEL[module]) || DEFAULT_TEAM_LABEL

  useEffect(() => {
    let cancelled = false
    setLoaded(false)
    fetchAssignees(endpoint).then((list) => {
      if (cancelled) return
      setAdmins(list)
      setLoaded(true)
    })
    return () => { cancelled = true }
  }, [endpoint])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (!wrapperRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [open])

  // Rendered via position: fixed at these viewport coordinates instead of
  // absolute-in-flow, so the panel escapes any ancestor's overflow clipping
  // (e.g. a horizontally-scrollable table) — same technique as the
  // Sidebar's collapsed-flyout. Recomputed every time the panel opens.
  const [panelPos, setPanelPos] = useState<{ top: number; left: number; openUpward: boolean } | null>(null)
  const PANEL_WIDTH = 260
  const PANEL_HEIGHT_ESTIMATE = 260

  useEffect(() => {
    if (open) {
      setQuery("")
      setTimeout(() => inputRef.current?.focus(), 0)
      const rect = wrapperRef.current?.getBoundingClientRect()
      if (rect) {
        const openUpward = window.innerHeight - rect.bottom < PANEL_HEIGHT_ESTIMATE && rect.top > PANEL_HEIGHT_ESTIMATE
        const left = Math.min(rect.left, window.innerWidth - PANEL_WIDTH - 8)
        setPanelPos({
          top: openUpward ? rect.top - 4 : rect.bottom + 4,
          left: Math.max(8, left),
          openUpward,
        })
      }
    } else {
      setPanelPos(null)
    }
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return admins
    return admins.filter((a) =>
      (a.name ?? "").toLowerCase().includes(q) || (a.email ?? "").toLowerCase().includes(q)
    )
  }, [admins, query])

  const selected = useMemo(() => admins.find((a) => a.id === value) ?? null, [admins, value])

  function pick(a: AdminUser | null) {
    onChange(a)
    setOpen(false)
  }

  const triggerClasses = compact
    ? "inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100"
    : "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(triggerClasses, disabled && "cursor-not-allowed opacity-60")}
        title={selected?.email ?? "Unassigned"}
      >
        {selected ? (
          <>
            <Avatar className={compact ? "h-4 w-4" : "h-5 w-5"}>
              {selected.image && <AvatarImage src={selected.image} alt={selected.name} />}
              <AvatarFallback className="bg-blue-600 text-white text-[9px] font-semibold">
                {initials(selected.name, selected.email)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-left flex-1">{selected.name || selected.email}</span>
          </>
        ) : (
          <>
            <UserCircle2 className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4", "opacity-60")} />
            <span className={cn("truncate text-left flex-1", !compact && "text-muted-foreground")}>Unassigned</span>
          </>
        )}
        {!disabled && <ChevronDown className={cn(compact ? "h-3 w-3" : "h-4 w-4", "opacity-50 flex-shrink-0")} />}
      </button>

      {open && panelPos && (
        <div
          ref={panelRef}
          style={{
            position: "fixed",
            top: panelPos.openUpward ? undefined : panelPos.top,
            bottom: panelPos.openUpward ? window.innerHeight - panelPos.top : undefined,
            left: panelPos.left,
            width: PANEL_WIDTH,
            zIndex: 60,
          }}
          className="rounded-md border bg-popover text-popover-foreground shadow-lg"
        >
          <div className="flex items-center gap-2 border-b px-2.5 py-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search team members…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {value && (
              <button
                type="button"
                onClick={() => pick(null)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                <X className="h-3.5 w-3.5" />
                Clear assignment
              </button>
            )}
            {!loaded ? (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">No team members match</div>
            ) : (
              filtered.map((a) => {
                const isActive = a.id === value
                return (
                  <button
                    type="button"
                    key={a.id}
                    onClick={() => pick(a)}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground",
                      isActive && "bg-blue-50 dark:bg-blue-950/30"
                    )}
                  >
                    <Avatar className="h-7 w-7">
                      {a.image && <AvatarImage src={a.image} alt={a.name} />}
                      <AvatarFallback className="bg-blue-600 text-white text-[10px] font-semibold">
                        {initials(a.name, a.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{a.name || a.email}</p>
                      <p className="text-xs text-muted-foreground truncate">{a.email}</p>
                    </div>
                    {isActive && <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />}
                  </button>
                )
              })
            )}
          </div>
          <div className="border-t px-3 py-1.5 text-[10px] text-muted-foreground">
            {filtered.length} of {admins.length} {teamLabel} member{admins.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}
    </div>
  )
}
