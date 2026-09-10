"use client"

import { useEffect, useMemo, useState } from "react"
import { Search, UsersRound } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface DirectoryUser {
  id: string
  name: string
  email: string
  image: string | null
  role: string
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  )
}

export default function EmployeeDirectoryPage() {
  const [users, setUsers] = useState<DirectoryUser[]>([])
  const [query, setQuery] = useState("")
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch("/api/users/directory")
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((data) => setUsers(Array.isArray(data.data) ? data.data : []))
      .finally(() => setLoaded(true))
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) =>
      (u.name ?? "").toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q) ||
      (u.role ?? "").toLowerCase().includes(q)
    )
  }, [users, query])

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-600 text-white"><UsersRound className="h-7 w-7" /></div>
        <h1 className="mt-5 text-3xl font-bold text-slate-900 dark:text-white">Employee Directory</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-400">Search for a colleague by name, email, or role.</p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email, or role…"
          className="w-full rounded-md border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900"
        />
      </div>

      <Card>
        <CardContent className="p-4">
          {!loaded ? (
            <p className="p-4 text-sm text-slate-500 dark:text-slate-400">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="p-4 text-sm text-slate-500 dark:text-slate-400">No colleagues match your search.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((u) => (
                <div key={u.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    {u.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.image} alt={u.name} className="h-full w-full object-cover" />
                    ) : initials(u.name ?? u.email)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{u.name || u.email}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
                    <p className="truncate text-xs text-emerald-600 dark:text-emerald-400">{u.role}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <p className="text-xs text-slate-500 dark:text-slate-400">{filtered.length} of {users.length} colleagues</p>
    </div>
  )
}
