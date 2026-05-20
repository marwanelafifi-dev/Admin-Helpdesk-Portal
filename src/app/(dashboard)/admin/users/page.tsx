"use client"

import { useEffect, useMemo, useState } from "react"
import { Search, MoreHorizontal, UserPlus, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SearchableSelect } from "@/components/ui/SearchableSelect"
import { getList } from "@/lib/companyDataStore"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type PlatformUser = {
  id: string
  email: string
  name: string | null
  role: string
  department: string | null
  active: boolean
  createdAt: string
  provider?: string
  image?: string | null
}

type RoleOption = {
  value: string
  label: string
  description?: string | null
}

const fallbackRoles: RoleOption[] = [
  { value: "Full Access", label: "Full Access" },
  { value: "Administration Team", label: "Administration Team" },
  { value: "People Team", label: "People Team" },
  { value: "Requester", label: "Requester" },
]

const ROLE_COLORS: Record<string, string> = {
  "Full Access": "bg-purple-100 text-purple-800",
  "Administration Team": "bg-blue-100 text-blue-800",
  "People Team": "bg-indigo-100 text-indigo-800",
  "Requester": "bg-gray-100 text-gray-700",
}

function roleLabel(role: string, roles: RoleOption[]) {
  return roles.find((item) => item.value === role)?.label ?? role
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))
}

function getDefaultRoleValue(roles: RoleOption[]) {
  const requester = roles.find((role) => role.value.toLowerCase() === "requester")
  if (requester) {
    return requester.value
  }

  const safeRole = roles.find((role) => !["Full Access", "Administration Team"].includes(role.value))
  return safeRole?.value ?? roles[0]?.value ?? "requester"
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState("")
  const [users, setUsers] = useState<PlatformUser[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [roles, setRoles] = useState<RoleOption[]>(fallbackRoles)
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState("")
  const [editingUser, setEditingUser] = useState<PlatformUser | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [updateError, setUpdateError] = useState("")
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "requester",
    department: "",
  })
  const [departments, setDepartments] = useState<string[]>([])
  useEffect(() => { setDepartments(getList("departments")) }, [])

  const loadUsers = async () => {
    setLoading(true)
    setLoadError("")

    const response = await fetch("/api/users", { credentials: "include" })

    if (!response.ok) {
      setLoadError(response.status === 403 ? "You do not have access to manage users." : "Users could not be loaded.")
      setLoading(false)
      return
    }

    const data = await response.json()
    setUsers(data.users ?? [])
    setLoading(false)
  }

  const loadRoles = async () => {
    const response = await fetch("/api/roles/options", { credentials: "include" })

    if (!response.ok) {
      setRoles(fallbackRoles)
      return
    }

    const data = await response.json()
    const nextRoles = data.roles?.length ? data.roles : fallbackRoles
    setRoles(nextRoles)
    setForm((current) =>
      nextRoles.some((role: RoleOption) => role.value === current.role)
        ? current
        : { ...current, role: getDefaultRoleValue(nextRoles) }
    )
  }

  useEffect(() => {
    loadUsers()
    loadRoles()
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return users.filter((user) => {
      const name = user.name ?? ""
      return (
        name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        roleLabel(user.role, roles).toLowerCase().includes(q)
      )
    })
  }, [search, users, roles])

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setCreateError("")

    const response = await fetch("/api/users", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })

    const data = await response.json()
    setCreating(false)

    if (!response.ok) {
      setCreateError(data.error ?? "User could not be created.")
      return
    }

    setUsers((current) => [data.user, ...current])
    setForm({
      name: "",
      email: "",
      password: "",
      role: getDefaultRoleValue(roles),
      department: "",
    })
    setShowCreateUser(false)
  }

  const resetCreateForm = () => {
    setForm({
      name: "",
      email: "",
      password: "",
      role: getDefaultRoleValue(roles),
      department: "",
    })
  }

  const handleEditUser = (user: PlatformUser) => {
    setEditingUser(user)
    setForm({
      name: user.name || "",
      email: user.email,
      password: "",
      role: user.role,
      department: user.department || "",
    })
    setUpdateError("")
    setShowEditDialog(true)
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return

    setUpdating(true)
    setUpdateError("")

    const payload: Record<string, any> = {}
    if (form.name) payload.name = form.name
    if (form.email) payload.email = form.email
    if (form.password) payload.password = form.password
    if (form.role) payload.role = form.role
    if (form.department !== undefined) payload.department = form.department

    const response = await fetch(`/api/users/${editingUser.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    const data = await response.json()
    setUpdating(false)

    if (!response.ok) {
      setUpdateError(data.error ?? "User could not be updated.")
      return
    }

    setUsers((current) =>
      current.map((u) => (u.id === editingUser.id ? data.user : u))
    )
    setShowEditDialog(false)
    setEditingUser(null)
    setForm({ name: "", email: "", password: "", role: "requester", department: "" })
  }

  const handleChangeRole = async (userId: string, newRole: string) => {
    const user = users.find((u) => u.id === userId)
    if (!user) return

    const response = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    })

    const data = await response.json()
    if (response.ok) {
      setUsers((current) =>
        current.map((u) => (u.id === userId ? data.user : u))
      )
    }
  }

  const handleDeactivateUser = async (userId: string) => {
    const user = users.find((u) => u.id === userId)
    if (!user) return

    const response = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !user.active }),
    })

    const data = await response.json()
    if (response.ok) {
      setUsers((current) =>
        current.map((u) => (u.id === userId ? data.user : u))
      )
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return
    }

    const response = await fetch(`/api/users/${userId}`, {
      method: "DELETE",
      credentials: "include",
    })

    if (response.ok) {
      setUsers((current) => current.filter((u) => u.id !== userId))
    }
  }

  const handleResetPassword = async (userId: string) => {
    const user = users.find((u) => u.id === userId)
    if (!user) return

    const newPassword = prompt("Enter a new temporary password (minimum 8 characters):")
    if (!newPassword || newPassword.length < 8) {
      alert("Password must be at least 8 characters.")
      return
    }

    const response = await fetch(`/api/users/${userId}/reset-password`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    })

    const data = await response.json()
    if (response.ok) {
      alert(`Password has been reset successfully. New password: ${newPassword}`)
    } else {
      alert(`Failed to reset password: ${data.error || "Unknown error"}`)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Manage platform users and their access
          </p>
        </div>
        <Button
          onClick={async () => {
            await loadRoles()
            resetCreateForm()
            setShowCreateUser(true)
          }}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: users.length },
          { label: "Active", value: users.filter((u) => u.active).length },
          { label: "Inactive", value: users.filter((u) => !u.active).length },
          { label: "Admins", value: users.filter((u) => u.role.includes("admin")).length },
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
            All Users{" "}
            <span className="text-muted-foreground font-normal text-sm">({filtered.length})</span>
          </CardTitle>
          <div className="relative mt-2 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loadError ? (
            <div className="p-6 text-sm text-destructive">{loadError}</div>
          ) : loading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading users...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Auth Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((user) => {
                  const displayName = user.name ?? user.email
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            {user.image && <AvatarImage src={user.image} alt={displayName} />}
                            <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-semibold">
                              {getInitials(displayName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{displayName}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            ROLE_COLORS[user.role] ?? "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {roleLabel(user.role, roles)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.provider === "google" || user.provider === "oauth"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {user.provider === "google" || user.provider === "oauth" ? "Google" : "Local"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                            user.active ? "text-green-600" : "text-gray-400"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              user.active ? "bg-green-500" : "bg-gray-300"
                            }`}
                          />
                          {user.active ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(user.createdAt)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditUser(user)}>
                              Edit user
                            </DropdownMenuItem>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <DropdownMenuItem
                                  onSelect={(e) => e.preventDefault()}
                                  className="flex justify-between"
                                >
                                  Change role
                                  <span className="ml-2">›</span>
                                </DropdownMenuItem>
                              </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" side="right">
                              {roles.map((role) => (
                                <DropdownMenuItem
                                  key={role.value}
                                  onClick={() => handleChangeRole(user.id, role.value)}
                                    className={user.role === role.value ? "bg-blue-50" : ""}
                                  >
                                    {role.label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                            {(!user.provider || user.provider === "local" || user.provider === "credentials") && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleResetPassword(user.id)}
                                  className="text-blue-600 focus:text-blue-600"
                                >
                                  Reset password
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeactivateUser(user.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              {user.active ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {showCreateUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold">Add local user</h2>
                <p className="text-sm text-muted-foreground">Create an email and password account.</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowCreateUser(false)
                  resetCreateForm()
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 px-6 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <SearchableSelect
                    value={form.department}
                    onChange={(v) => setForm((current) => ({ ...current, department: v }))}
                    options={departments}
                    placeholder="Select department"
                    allowClear
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-user-email">Email</Label>
                <Input
                  id="new-user-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-user-password">Password</Label>
                <Input
                  id="new-user-password"
                  type="password"
                  minLength={8}
                  value={form.password}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, password: e.target.value }))
                  }
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                New users are assigned the <strong>Requester</strong> role by default. You can change their role after creation.
              </p>

              {createError && <p className="text-sm text-destructive">{createError}</p>}

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateUser(false)
                    resetCreateForm()
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? "Creating..." : "Create User"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditDialog && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold">Edit user</h2>
                <p className="text-sm text-muted-foreground">Update user details and permissions.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowEditDialog(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4 px-6 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    value={form.name}
                    onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <SearchableSelect
                    value={form.department}
                    onChange={(v) => setForm((current) => ({ ...current, department: v }))}
                    options={departments}
                    placeholder="Select department"
                    allowClear
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-password">Password (leave blank to keep current)</Label>
                  <Input
                    id="edit-password"
                    type="password"
                    minLength={8}
                    value={form.password}
                    onChange={(e) =>
                      setForm((current) => ({ ...current, password: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={form.role}
                    onValueChange={(role) => setForm((current) => ({ ...current, role }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {updateError && <p className="text-sm text-destructive">{updateError}</p>}

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updating}>
                  {updating ? "Updating..." : "Update User"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
