"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Plus, X, Mail, ChevronDown, Search, Check, Users } from "lucide-react"
import { cn } from "@/lib/utils"

interface DirectoryUser {
  id: string
  name: string
  email: string
  image: string | null
  role: string
}

interface CcEmailsFieldProps {
  value: string[]
  onChange: (emails: string[]) => void
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
 * UserPicker — searchable dropdown sourced from /api/users/directory.
 * Mirrors the look of SearchableSelect used in Company Data forms.
 */
function UserPicker({
  excludedEmails,
  onPick,
}: {
  excludedEmails: Set<string>
  onPick: (email: string) => void
}) {
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
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-muted-foreground"
        )}
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
                <p className="mt-1 text-[10px] opacity-70">For external recipients, use the email field on the right.</p>
              </div>
            ) : (
              filtered.map((u) => {
                const already = excludedEmails.has(u.email.toLowerCase())
                return (
                  <button
                    type="button"
                    key={u.id}
                    disabled={already}
                    onClick={() => { onPick(u.email); setOpen(false) }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground text-left",
                      already && "opacity-50 cursor-not-allowed hover:bg-transparent"
                    )}
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
                    {already && <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />}
                  </button>
                )
              })
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

export function CcEmailsField({ value, onChange }: CcEmailsFieldProps) {
  const [input, setInput] = useState("")
  const [error, setError] = useState("")

  const lowerValue = useMemo(() => new Set(value.map((v) => v.toLowerCase())), [value])

  function addEmail(rawEmail: string) {
    const email = rawEmail.trim().toLowerCase()
    if (!email) return
    if (!isValidEmail(email)) { setError("Invalid email address"); return }
    if (lowerValue.has(email)) { setError("Already added"); return }
    onChange([...value, email])
    setInput("")
    setError("")
  }

  function handleAdd() { addEmail(input) }

  function handleRemove(email: string) {
    onChange(value.filter((e) => e !== email))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); handleAdd() }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Left — portal users */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-blue-500" />
            Portal Users
          </p>
          <p className="text-[11px] text-muted-foreground">
            Select from users who already have an account on this portal.
          </p>
          <UserPicker excludedEmails={lowerValue} onPick={addEmail} />
        </div>

        {/* Right — external emails */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-gray-400" />
            External Recipients
          </p>
          <p className="text-[11px] text-muted-foreground">
            For anyone outside the portal — type their email address directly.
          </p>
          <div className="flex gap-2 min-w-0">
            <input
              type="email"
              value={input}
              onChange={(e) => { setInput(e.target.value); setError("") }}
              onKeyDown={handleKeyDown}
              placeholder="name@company.com"
              className={cn(
                "flex-1 rounded-md border bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0",
                error ? "border-red-400" : "border-gray-300"
              )}
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={!input.trim()}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>
        </div>
      </div>

      {error && <p className="text-xs text-red-500 flex items-center gap-1"><span>⚠</span>{error}</p>}

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {value.map((email) => (
            <span
              key={email}
              className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-medium text-blue-700"
            >
              <Mail className="h-3 w-3 shrink-0" />
              {email}
              <button
                type="button"
                onClick={() => handleRemove(email)}
                className="rounded-full hover:bg-blue-100 p-0.5"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground border-t pt-2">
        All CC'd recipients will receive email notifications for every update on this request.
      </p>
    </div>
  )
}
