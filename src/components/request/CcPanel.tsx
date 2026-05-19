"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { X, Plus, Mail, Users, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface CcPanelProps {
  ccEmails: string[]        // from form payload (read-only display)
  adminCc: string[]         // admin-managed list (editable)
  onAdminCcChange: (emails: string[]) => void
  canEdit?: boolean         // only Admin/Super Admin
}

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

export function CcPanel({ ccEmails, adminCc, onAdminCcChange, canEdit = false }: CcPanelProps) {
  const [input, setInput] = useState("")
  const [error, setError] = useState("")
  const [open, setOpen] = useState(false)
  const [users, setUsers] = useState<DirectoryUser[]>([])
  const [loaded, setLoaded] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const allCc = useMemo(
    () => Array.from(new Set([...ccEmails, ...adminCc])),
    [ccEmails, adminCc]
  )
  const lowerAll = useMemo(() => new Set(allCc.map((e) => e.toLowerCase())), [allCc])

  useEffect(() => {
    if (!canEdit) return
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
  }, [canEdit])

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [open])

  const filtered = useMemo(() => {
    const q = input.trim().toLowerCase()
    const base = users.filter((u) => !!u.email)
    if (!q) return base
    return base.filter((u) =>
      (u.name ?? "").toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q)
    )
  }, [users, input])

  function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  function addEmail(rawEmail: string) {
    const email = rawEmail.trim().toLowerCase()
    if (!email) return
    if (!isValidEmail(email)) { setError("Invalid email address"); return }
    if (adminCc.some((e) => e.toLowerCase() === email)) { setError("Already in CC list"); return }
    onAdminCcChange([...adminCc, email])
    setInput("")
    setError("")
    setOpen(false)
  }

  function handleAdd() { addEmail(input) }

  function handleRemove(email: string) {
    onAdminCcChange(adminCc.filter((e) => e.toLowerCase() !== email.toLowerCase()))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); handleAdd() }
    else if (e.key === "Escape") setOpen(false)
  }

  return (
    <div ref={wrapperRef} className="border rounded-lg bg-gray-50 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
        <Users className="h-4 w-4 text-blue-500" />
        CC Recipients
        <span className="ml-auto text-xs font-normal text-gray-400">
          Copied on all email updates for this request
        </span>
      </div>

      {/* CC list */}
      <div className="flex flex-wrap gap-2 min-h-[24px]">
        {allCc.length === 0 ? (
          <span className="text-xs text-gray-400 italic">No CC recipients added yet</span>
        ) : (
          allCc.map((email) => {
            const isAdminAdded = adminCc.some((e) => e.toLowerCase() === email.toLowerCase())
            const isFromForm = ccEmails.some((e) => e.toLowerCase() === email.toLowerCase())
            return (
              <span
                key={email}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                  isAdminAdded && !isFromForm ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-700"
                )}
              >
                <Mail className="h-3 w-3 shrink-0" />
                {email}
                {isFromForm && <span className="text-[10px] opacity-60 ml-0.5">(from form)</span>}
                {canEdit && isAdminAdded && (
                  <button
                    onClick={() => handleRemove(email)}
                    className="ml-0.5 rounded-full hover:bg-blue-200 p-0.5 transition-colors"
                    aria-label={`Remove ${email}`}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </span>
            )
          })
        )}
      </div>

      {/* Admin-only add input with user directory dropdown */}
      {canEdit && (
        <div className="space-y-1 relative">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => { setInput(e.target.value); setError(""); setOpen(true) }}
              onFocus={() => setOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder="Add email or pick a user…"
              className={cn(
                "flex-1 rounded-md border bg-white px-3 py-1.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500",
                error ? "border-red-400" : "border-gray-300"
              )}
            />
            <button
              onClick={handleAdd}
              disabled={!input.trim()}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>

          {open && (
            <div className="absolute z-50 mt-1 left-0 right-[88px] rounded-md border border-gray-200 bg-white shadow-lg max-h-64 overflow-y-auto">
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
                    const already = lowerAll.has(u.email.toLowerCase())
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

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  )
}
