"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Search, UserPlus, Trash2, Chrome, KeyRound, X, Check, Shield } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { can } from "@/lib/permissions"

type CustomPermission = { permission: string; allowed: boolean }

type DBUser = {
  id: string
  name: string | null
  email: string | null
  role: string
  sessionVersion: number
  createdAt: string
  emailVerified: string | null
  customPermissions?: CustomPermission[]
}

const ALL_PERMISSIONS = [
  { key: "dashboard",      label: "View Dashboard" },
  { key: "allRequests",    label: "View All Requests" },
  { key: "hrModule",       label: "View HR Module" },
  { key: "hrCreate",       label: "Create HR Requests" },
  { key: "adminPanel",     label: "Admin Panel Access" },
  { key: "updateRequests", label: "Update Requests" },
  { key: "deleteRequests", label: "Delete Requests" },
]

function PermissionsModal({
  user,
  onClose,
  onSaved,
}: {
  user: DBUser
  onClose: () => void
  onSaved: () => void
}) {
  const [perms, setPerms] = useState<CustomPermission[]>(user.customPermissions ?? [])
  const [saving, setSaving] = useState(false)

  function getState(key: string): boolean | null {
    const found = perms.find((p) => p.permission === key)
    return found ? found.allowed : null
  }

  function toggle(key: string, allowed: boolean | null) {
    if (allowed === null) {
      // Add override
      setPerms((prev) => [...prev.filter((p) => p.permission !== key), { permission: key, allowed: true }])
    } else if (allowed === true) {
      setPerms((prev) => prev.map((p) => p.permission === key ? { ...p, allowed: false } : p))
    } else {
      // Remove override (back to role default)
      setPerms((prev) => prev.filter((p) => p.permission !== key))
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await fetch(`/api/admin/users/${user.id}/custom-permissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customPermissions: perms }),
      })
      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-600" />
              Custom Permissions
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">{user.name ?? user.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-2">
          <p className="text-xs text-muted-foreground mb-3">
            Overrides apply on top of the user's role. Grey = role default, Green = allowed, Red = denied.
          </p>
          {ALL_PERMISSIONS.map(({ key, label }) => {
            const state = getState(key)
            return (
              <div key={key} className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="text-sm text-gray-700">{label}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => toggle(key, state)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      state === true
                        ? "bg-green-100 text-green-700 ring-1 ring-green-400"
                        : "bg-gray-100 text-gray-500 hover:bg-green-50"
                    }`}
                  >
                    Allow
                  </button>
                  <button
                    onClick={() => {
                      if (state === false) setPerms((prev) => prev.filter((p) => p.permission !== key))
                      else setPerms((prev) => [...prev.filter((p) => p.permission !== key), { permission: key, allowed: false }])
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      state === false
                        ? "bg-red-100 text-red-700 ring-1 ring-red-400"
                        : "bg-gray-100 text-gray-500 hover:bg-red-50"
                    }`}
                  >
                    Deny
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex gap-2 p-5 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? "Saving..." : "Save Permissions"}
          </Button>
        </div>
      </div>
    </div>
  )
}

const ROLES = [
  { value: "super_admin", label: "Super Admin", color: "bg-purple-100 text-purple-800" },
  { value: "admin",       label: "Admin",       color: "bg-blue-100 text-blue-800" },
  { value: "manager",     label: "Manager",     color: "bg-indigo-100 text-indigo-800" },
  { value: "employee",    label: "Employee",    color: "bg-gray-100 text-gray-700" },
  { value: "external",    label: "External",    color: "bg-amber-100 text-amber-800" },
]

const ROLE_MAP = Object.fromEntries(ROLES.map((r) => [r.value, r]))

function getInitials(name: string | null) {
  if (!name) return "?"
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

// Inline role picker shown directly in the table row
function RoleCell({ user, onRoleChange }: { user: DBUser; onRoleChange: (id: string, role: string) => Promise<void> }) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleChange = async (newRole: string) => {
    if (newRole === user.role) return
    setSaving(true)
    await onRoleChange(user.id, newRole)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const current = ROLE_MAP[user.role]

  return (
    <div className="flex items-center gap-2">
      <Select value={user.role} onValueChange={handleChange} disabled={saving}>
        <SelectTrigger className="h-7 text-xs border-0 bg-transparent p-0 w-auto gap-1.5 focus:ring-0 shadow-none">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${current?.color ?? "bg-gray-100 text-gray-700"}`}>
            {current?.label ?? user.role}
          </span>
        </SelectTrigger>
        <SelectContent>
          {ROLES.map((r) => (
            <SelectItem key={r.value} value={r.value}>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${r.color}`}>
                {r.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {saving && <span className="text-[10px] text-gray-400">Saving...</span>}
      {saved && <Check className="h-3.5 w-3.5 text-green-500" />}
    </div>
  )
}

export default function AdminUsersPage() {
  const { data: session } = useSession()
  const role = session?.user?.role as string | undefined
  const [users, setUsers] = useState<DBUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [showDialog, setShowDialog] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState("")
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "external" })
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [permUser, setPermUser] = useState<DBUser | null>(null)

  const load = useCallback(async (targetPage: number) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        limit: String(limit),
      })
      const res = await fetch(`/api/admin/users?${params}`)
      if (res.ok) {
        const payload = await res.json() as {
          data: DBUser[]
          total: number
          page: number
          limit: number
          totalPages: number
        }
        setUsers(payload.data)
        setTotal(payload.total)
        setPage(payload.page)
        setTotalPages(payload.totalPages)
      }
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => { void load(1) }, [load])

  const filtered = users.filter((u) => {
    const q = search.toLowerCase()
    return (
      (u.name ?? "").toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    )
  })

  const handleCreate = async () => {
    setFormError("")
    if (!form.name || !form.email || !form.password) {
      setFormError("Name, email and password are required.")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setFormError(data.error ?? "Failed to create user."); return }
      setShowDialog(false)
      setForm({ name: "", email: "", password: "", role: "external" })
      await load(page)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRoleChange = async (id: string, role: string) => {
    const res = await fetch("/api/users/role", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: id, newRoleId: role }),
    })
    if (res.ok) {
      const payload = await res.json() as { user: DBUser }
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, role: payload.user.role, sessionVersion: payload.user.sessionVersion } : u))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this user? This action cannot be undone.")) return
    setDeletingId(id)
    try {
      await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      const nextPage = users.length === 1 && page > 1 ? page - 1 : page
      await load(nextPage)
    } finally {
      setDeletingId(null)
    }
  }

  const googleCount = users.filter((u) => u.emailVerified).length
  const externalCount = users.filter((u) => !u.emailVerified).length
  const adminCount = users.filter((u) => u.role === "admin" || u.role === "super_admin").length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage platform users and their access roles</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
          <UserPlus className="h-4 w-4 mr-2" />
          Add External User
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: total },
          { label: "Google Users", value: googleCount },
          { label: "External Users", value: externalCount },
          { label: "Admins", value: adminCount },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold mt-0.5">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">
            All Users <span className="text-muted-foreground font-normal text-sm">({total})</span>
          </CardTitle>
          <div className="relative mt-2 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search users..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Auth Method</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">Loading...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">No users found.</TableCell>
                </TableRow>
              ) : filtered.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-semibold">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{user.name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{user.email ?? "—"}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <RoleCell user={user} onRoleChange={handleRoleChange} />
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${user.emailVerified ? "text-blue-600" : "text-amber-600"}`}>
                      {user.emailVerified
                        ? <><Chrome className="h-3.5 w-3.5" /> Google</>
                        : <><KeyRound className="h-3.5 w-3.5" /> Credentials</>
                      }
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-400 hover:text-blue-600"
                      title="Custom Permissions"
                      onClick={() => setPermUser(user)}
                    >
                      <Shield className="h-4 w-4" />
                    </Button>
                    {can(role, "deleteRequests") && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-red-500"
                        disabled={deletingId === user.id}
                        onClick={() => handleDelete(user.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => void load(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || loading}
                onClick={() => void load(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add External User</h2>
              <button onClick={() => setShowDialog(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <Input placeholder="John Doe" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" placeholder="user@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Password</Label>
                <Input type="password" placeholder="Minimum 8 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${r.color}`}>{r.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {formError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2.5">
                  <X className="h-4 w-4 flex-shrink-0" />
                  {formError}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white">
                {submitting ? "Creating..." : "Create User"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Permissions Modal */}
      {permUser && (
        <PermissionsModal
          user={permUser}
          onClose={() => setPermUser(null)}
          onSaved={() => { setPermUser(null); void load(page) }}
        />
      )}
    </div>
  )
}
