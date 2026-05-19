"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Plus, X, Mail, Users, Check } from "lucide-react"
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

export function CcEmailsField({ value, onChange }: CcEmailsFieldProps) {
  const [input, setInput] = useState("")
  const [error, setError] = useState("")
  const [open, setOpen] = useState(false)
  const [users, setUsers] = useState<DirectoryUser[]>([])
  const [loaded, setLoaded] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Load the user directory once per mount. Refreshes whenever the field is
  // re-mounted (e.g. opening a new request form), so users added via Admin >
  // Users show up next time the form is opened.
  useEffect(() => {
    let cancelled = false
    fetch("/api/users/directory")
      .then((res) => res.ok ? res.json() : { data: [] })
      .then((data) => {
        if (cancelled) return
        setUsers(Array.isArray(data.data) ? data.data : [])
        setLoaded(true)
      })
      .catch(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => { cancelled = true }
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [open])

  const lowerValue = useMemo(() => new Set(value.map((v) => v.toLowerCase())), [value])

  const filtered = useMemo(() => {
    const q = input.trim().toLowerCase()
    const base = users.filter((u) => !!u.email)
    if (!q) return base
    return base.filter((u) =>
      (u.name ?? "").toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q)
    )
  }, [users, input])

  function addEmail(email: string) {
    const e = email.trim().toLowerCase()
    if (!e) return
    if (!isValidEmail(e)) { setError("Invalid email address"); return }
    if (lowerValue.has(e)) { setError("Already added"); return }
    onChange([...value, e])
    setInput("")
    setError("")
    setOpen(false)
  }

  function handleAdd() {
    addEmail(input)
  }

  function handleRemove(email: string) {
    onChange(value.filter((e) => e !== email))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAdd()
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  return (
    <div ref={wrapperRef} className="space-y-2">
      <div className="relative">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(""); setOpen(true) }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Add email or pick a user…"
            className={cn(
              "flex-1 rounded-md border bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500",
              error ? "border-red-400" : "border-gray-300"
            )}
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!input.trim()}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>

        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg max-h-64 overflow-y-auto">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              <Users className="h-3 w-3" />
              <span>User</span>
              <span className="ml-auto font-normal normal-case tracking-normal text-gray-400">
                {loaded ? `${filtered.length} of ${users.length}` : "Loading…"}
              </span>
            </div>
            {loaded && filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-gray-500">
                {input.trim()
                  ? <>No users match. Press <kbd className="px-1 border rounded text-[10px]">Enter</kbd> to CC <span className="font-medium">{input.trim()}</span> directly.</>
                  : "No users in directory"
                }
              </div>
            ) : (
              <ul>
                {filtered.map((u) => {
                  const already = lowerValue.has(u.email.toLowerCase())
                  return (
                    <li key={u.id}>
                      <button
                        type="button"
                        onClick={() => addEmail(u.email)}
                        disabled={already}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-blue-50 transition-colors",
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
                          <p className="font-medium text-gray-900 truncate">{u.name || u.email}</p>
                          <p className="text-xs text-gray-500 truncate">{u.email}</p>
                        </div>
                        {already && <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
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

      <p className="text-xs text-gray-400">
        These addresses will receive email notifications for all updates on this request.
      </p>
    </div>
  )
}
