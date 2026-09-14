"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { X, Mail, ChevronDown, Search, Users, UserCheck } from "lucide-react"
import { cn } from "@/lib/utils"

interface DirectoryUser {
  id: string
  name: string
  email: string
  image: string | null
  role: string
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?"
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * Single-value approver picker — any portal user (sourced from
 * /api/users/directory, same endpoint CcEmailsField uses) or a free-typed
 * email address. Unlike CcEmailsField this holds exactly one value, not a
 * list — picking a new one replaces whatever was selected before.
 */
function UserPicker({ onPick }: { onPick: (email: string, name: string) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [users, setUsers] = useState<DirectoryUser[]>([])
  const [loaded, setLoaded] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/users/directory")
      .then((res) => res.ok ? res.json() : { data: [] })
      .then((data) => {
        if (cancelled) return
        setUsers(Array.isArray(data.data) ? data.data : [])
        setLoaded(true)
      })
      .catch(() => { if (!cancelled) setLoaded(true) })
    return () => { cancelled = true }
  }, [])

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
    if (!q) return users
    return users.filter((u) =>
      (u.name ?? "").toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q)
    )
  }, [users, query])

  return (
    <div ref={wrapperRef} className="relative flex-1 min-w-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-muted-foreground"
      >
        <span className="flex items-center gap-2 truncate text-left">
          <Users className="h-4 w-4 opacity-60 flex-shrink-0" />
          Select a portal user…
        </span>
        <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
          <div className="flex items-center gap-2 border-b px-2.5 py-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {!loaded ? (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">Loading portal users…</div>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                <p>No portal users match.</p>
                <p className="mt-1 text-[10px] opacity-70">For anyone else, use the email field on the right.</p>
              </div>
            ) : (
              filtered.map((u) => (
                <button
                  type="button"
                  key={u.id}
                  onClick={() => { onPick(u.email, u.name || u.email); setOpen(false) }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground text-left"
                >
                  <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {u.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.image} alt={u.name} className="h-full w-full object-cover" />
                    ) : initials(u.name ?? u.email)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{u.name || u.email}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                </button>
              ))
            )}
          </div>
          <div className="border-t px-3 py-1.5 text-[10px] text-muted-foreground">
            {filtered.length} of {users.length}
          </div>
        </div>
      )}
    </div>
  )
}

export function ApproverField({
  email,
  name,
  onChange,
}: {
  email?: string
  name?: string
  onChange: (approver: { email: string; name: string }) => void
}) {
  const [input, setInput] = useState("")
  const [error, setError] = useState("")

  function setApprover(newEmail: string, newName: string) {
    onChange({ email: newEmail.trim().toLowerCase(), name: newName.trim() })
    setInput("")
    setError("")
  }

  function handleAdd() {
    const trimmed = input.trim()
    if (!trimmed) return
    if (!isValidEmail(trimmed)) { setError("Invalid email address"); return }
    setApprover(trimmed, trimmed)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); handleAdd() }
  }

  function handleClear() {
    onChange({ email: "", name: "" })
  }

  if (email) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
        <UserCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-emerald-900 truncate">{name || email}</p>
          {name && <p className="text-xs text-emerald-700 truncate">{email}</p>}
        </div>
        <button type="button" onClick={handleClear} className="rounded-full hover:bg-emerald-100 p-1 flex-shrink-0">
          <X className="h-3.5 w-3.5 text-emerald-700" />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <p className="text-[11px] text-muted-foreground">Select from portal users</p>
          <UserPicker onPick={setApprover} />
        </div>
        <div className="space-y-1">
          <p className="text-[11px] text-muted-foreground">Or type an email address</p>
          <div className="flex gap-2 min-w-0">
            <input
              type="email"
              value={input}
              onChange={(e) => { setInput(e.target.value); setError("") }}
              onKeyDown={handleKeyDown}
              placeholder="name@company.com"
              className={cn(
                "flex-1 rounded-md border bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 min-w-0",
                error ? "border-red-400" : "border-gray-300"
              )}
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={!input.trim()}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              <Mail className="h-4 w-4" />
              Set
            </button>
          </div>
        </div>
      </div>
      {error && <p className="text-xs text-red-500 flex items-center gap-1"><span>⚠</span>{error}</p>}
    </div>
  )
}

export default ApproverField
