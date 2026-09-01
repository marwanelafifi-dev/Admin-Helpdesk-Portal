"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Shield, Plus, Users, Check, X, Edit2, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PAGES as REGISTERED_PAGES, pagesByGroup } from "@/lib/pageRegistry"

type Role = {
  id: string
  name: string
  description: string | null
  permissions: string[]
  createdAt: string
  companyId?: "si_ware" | "buchi"
}

const PERMISSION_LABELS: Record<string, string> = {
  create: "Create",
  read: "Read",
  read_own: "Read Own",
  update: "Update",
  update_status: "Update Status",
  delete: "Delete",
  activity: "Activity",
  view_details: "View Details",
  edit_request: "Edit Request",
  cancel_request: "Cancel Request",
  manage_cc: "Manage CC",
  assign_requests: "Assign Requests",
  manage_tasks: "Manage Tasks",
  manage_feedback: "Manage Feedback",
  manage_users: "Manage Users",
  manage_roles: "Manage Roles",
  settings: "Settings",
}

const AVAILABLE_PERMISSIONS = [
  "create",
  "read",
  "read_own",
  "update",
  "update_status",
  "delete",
  "activity",
  "view_details",
  "edit_request",
  "cancel_request",
  "manage_cc",
  "assign_requests",
  "manage_tasks",
  "manage_feedback",
  "manage_users",
  "manage_roles",
  "settings",
]

// Pages come from the central registry — adding a page in src/lib/pageRegistry.ts
// makes it appear here automatically.
const PAGES = REGISTERED_PAGES

const ROLE_COLORS: Record<string, string> = {
  "Super Admin": "border-purple-200 bg-purple-50",
  Admin: "border-blue-200 bg-blue-50",
  Manager: "border-indigo-200 bg-indigo-50",
  "Requester - Si-Ware": "border-blue-200 bg-blue-50",
  "Requester - BUCHI": "border-orange-200 bg-orange-50",
  Viewer: "border-slate-200 bg-slate-50",
}

const ICON_COLORS: Record<string, string> = {
  "Super Admin": "text-purple-600 bg-purple-100",
  Admin: "text-blue-600 bg-blue-100",
  Manager: "text-indigo-600 bg-indigo-100",
  "Requester - Si-Ware": "text-blue-700 bg-blue-100",
  "Requester - BUCHI": "text-orange-700 bg-orange-100",
  Viewer: "text-slate-600 bg-slate-100",
}

export default function AdminRolesPage() {
  const pathname = usePathname()
  const companyId = pathname.endsWith("/buchi") ? "buchi" : "si_ware"
  const companyName = companyId === "buchi" ? "BUCHI" : "Si-Ware Systems"
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: [] as string[],
    pages: [] as string[],
    readModules: [] as string[],
    readAllModules: [] as string[],
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const loadRoles = async () => {
    setLoading(true)
    const response = await fetch(`/api/roles?company=${companyId}`, { credentials: "include" })
    const data = await response.json()
    if (response.ok) {
      setRoles(data.roles || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadRoles()
  }, [companyId])

  const openCreateDialog = () => {
    setEditingRole(null)
    setFormData({ name: "", description: "", permissions: [], pages: [], readModules: [], readAllModules: [] })
    setError("")
    setShowDialog(true)
  }

  const openEditDialog = (role: Role) => {
    setEditingRole(role)
    const pages = role.permissions
      .filter((p: string) => p.startsWith("page:"))
      .map((p: string) => p.replace("page:", ""))
    const otherPermissions = role.permissions.filter((p: string) => !p.startsWith("page:"))
    setFormData({
      name: role.name,
      description: role.description || "",
      permissions: otherPermissions,
      pages,
      readModules: (role as any).readModules || [],
      readAllModules: (role as any).readAllModules || [],
    })
    setError("")
    setShowDialog(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")

    const pagePermissions = formData.pages.map((p) => `page:${p}`)
    const allPermissions = [...formData.permissions, ...pagePermissions]

    const payload = {
      name: formData.name,
      description: formData.description || undefined,
      permissions: allPermissions,
      readModules: formData.readModules,
      readAllModules: formData.readAllModules,
      companyId,
    }

    const method = editingRole ? "PATCH" : "POST"
    const url = editingRole ? `/api/roles/${editingRole.id}` : "/api/roles"

    const response = await fetch(url, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    const data = await response.json()
    setSaving(false)

    if (!response.ok) {
      setError(data.error || "Failed to save role")
      return
    }

    if (editingRole) {
      setRoles((current) =>
        current.map((r) => (r.id === editingRole.id ? data.role : r))
      )
    } else {
      setRoles((current) => [data.role, ...current])
    }

    setShowDialog(false)
  }

  const handleDelete = async (roleId: string) => {
    if (!confirm("Are you sure you want to delete this role?")) return

    const response = await fetch(`/api/roles/${roleId}`, {
      method: "DELETE",
      credentials: "include",
    })

    if (response.ok) {
      setRoles((current) => current.filter((r) => r.id !== roleId))
    }
  }

  const togglePermission = (permission: string) => {
    setFormData((current) => ({
      ...current,
      permissions: current.permissions.includes(permission)
        ? current.permissions.filter((p) => p !== permission)
        : [...current.permissions, permission],
    }))
  }

  const togglePage = (pageId: string) => {
    setFormData((current) => ({
      ...current,
      pages: current.pages.includes(pageId)
        ? current.pages.filter((p) => p !== pageId)
        : [...current.pages, pageId],
    }))
  }

  const toggleAllPermissions = () => {
    const allSelected = formData.permissions.length === AVAILABLE_PERMISSIONS.length
    setFormData((current) => ({
      ...current,
      permissions: allSelected ? [] : AVAILABLE_PERMISSIONS,
    }))
  }

  const toggleAllPages = () => {
    const allSelected = formData.pages.length === PAGES.length
    setFormData((current) => ({
      ...current,
      pages: allSelected ? [] : PAGES.map((p) => p.id),
    }))
  }

  const MODULES = ["shipping", "maintenance", "purchase", "event", "travel", "hr", "general"] as const

  const toggleModule = (module: string) => {
    setFormData((current) => {
      const isSelected = current.readModules.includes(module)
      const newReadModules = isSelected
        ? current.readModules.filter((m) => m !== module)
        : [...current.readModules, module]

      // Auto-sync page permissions: add/remove corresponding page access when module is selected/deselected
      const pagePermissions = [`${module}`, `${module}-new`]
      let newPages = current.pages

      if (isSelected) {
        // Removing module - also remove its page permissions
        newPages = newPages.filter((p) => !pagePermissions.includes(p))
      } else {
        // Adding module - also add its page permissions
        newPages = [...new Set([...newPages, ...pagePermissions])]
      }

      return {
        ...current,
        readModules: newReadModules,
        pages: newPages,
      }
    })
  }

  const toggleReadAllModule = (module: string) => {
    setFormData((current) => ({
      ...current,
      readAllModules: current.readAllModules.includes(module)
        ? current.readAllModules.filter((m) => m !== module)
        : [...current.readAllModules, module],
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Roles - {companyName}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Define roles and manage access permissions for {companyName}
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Create Role
        </Button>
      </div>

      {/* Role cards */}
      {loading ? (
        <div className="p-6 text-sm text-muted-foreground">Loading roles...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {roles.map((role) => (
            <Card
              key={role.id}
              className={`border-2 ${ROLE_COLORS[role.name] ?? "border-gray-200 bg-gray-50"}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                        ICON_COLORS[role.name] ?? "text-gray-600 bg-gray-100"
                      }`}
                    >
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold">{role.name}</CardTitle>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => openEditDialog(role)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(role.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{role.description}</p>
              </CardHeader>

              <CardContent>
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                  Permissions
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {role.permissions.length > 0 ? (
                    role.permissions.map((perm) => (
                      <span
                        key={perm}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-white border border-gray-200 text-gray-700 font-medium"
                      >
                        <Check className="h-3 w-3 text-green-500" />
                        {PERMISSION_LABELS[perm] ?? perm}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground italic">No permissions</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl w-full max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>{editingRole ? "Edit Role" : "Create Role"}</DialogTitle>
            <DialogDescription>
              {editingRole
                ? "Update the role name, description, and permissions"
                : "Create a new role with specific permissions"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 gap-4 overflow-hidden">
            <div className="overflow-y-auto flex-1 pr-1 space-y-5">
              {/* Name + Description row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role-name">Role Name</Label>
                  <Input
                    id="role-name"
                    value={formData.name}
                    onChange={(e) => setFormData((current) => ({ ...current, name: e.target.value }))}
                    placeholder="e.g., Content Manager"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role-desc">Description</Label>
                  <Input
                    id="role-desc"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((current) => ({ ...current, description: e.target.value }))
                    }
                    placeholder="What does this role do?"
                  />
                </div>
              </div>

              {/* Permissions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Permissions</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={toggleAllPermissions}
                  >
                    {formData.permissions.length === AVAILABLE_PERMISSIONS.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>
                <div className="grid grid-cols-4 gap-2 p-3 border rounded-lg bg-gray-50">
                  {AVAILABLE_PERMISSIONS.map((perm) => (
                    <label
                      key={perm}
                      className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded"
                    >
                      <Checkbox
                        checked={formData.permissions.includes(perm)}
                        onCheckedChange={() => togglePermission(perm)}
                      />
                      <span className="text-sm font-medium">{PERMISSION_LABELS[perm]}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Page Access */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Page Access</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={toggleAllPages}
                  >
                    {formData.pages.length === PAGES.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>
                <div className="space-y-4 p-3 border rounded-lg bg-gray-50">
                  {pagesByGroup().map(({ group, pages }) => (
                    <div key={group} className="space-y-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{group}</p>
                      <div className="grid grid-cols-3 gap-2">
                        {pages.map((page) => (
                          <label
                            key={page.id}
                            className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded"
                          >
                            <Checkbox
                              checked={formData.pages.includes(page.id)}
                              onCheckedChange={() => togglePage(page.id)}
                            />
                            <span className="text-sm font-medium">{page.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Module Access Control */}
              <div className="space-y-3 border-t pt-4">
                <Label className="text-sm font-semibold block">Module Access Control</Label>
                <p className="text-xs text-gray-600 mb-3">
                  Select which modules users can access. Page access permissions are automatically enabled/disabled below based on your selections here. In "View ALL Requests", users see all requests from that module. Otherwise, they only see their own.
                </p>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-gray-700">Accessible Modules (Which modules can they see?):</Label>
                    <div className="grid grid-cols-3 gap-2 p-3 border rounded-lg bg-blue-50">
                      {MODULES.map((module) => (
                        <label
                          key={module}
                          className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded capitalize"
                        >
                          <Checkbox
                            checked={formData.readModules.includes(module)}
                            onCheckedChange={() => toggleModule(module)}
                          />
                          <span className="text-sm font-medium">{module}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-gray-700">View ALL Requests From (Which modules show all requests?):</Label>
                    <div className="grid grid-cols-3 gap-2 p-3 border rounded-lg bg-emerald-50">
                      {MODULES.map((module) => (
                        <label
                          key={`readall-${module}`}
                          className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded capitalize"
                        >
                          <Checkbox
                            checked={formData.readAllModules.includes(module)}
                            onCheckedChange={() => toggleReadAllModule(module)}
                            disabled={!formData.readModules.includes(module)}
                          />
                          <span className="text-sm font-medium text-gray-700">{module}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Note: Can only enable for modules they have access to above</p>
                  </div>
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-destructive shrink-0">{error}</p>}

            <div className="flex justify-end gap-2 pt-4 border-t shrink-0">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !formData.name.trim()}>
                {saving ? "Saving..." : editingRole ? "Update Role" : "Create Role"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
