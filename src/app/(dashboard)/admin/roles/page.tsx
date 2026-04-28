import { Shield, Plus, Users, Check } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { mockRoles } from "@/lib/mock-data"

const PERMISSION_LABELS: Record<string, string> = {
  create: "Create",
  read: "Read",
  read_own: "Read Own",
  update: "Update",
  delete: "Delete",
  approve: "Approve",
  reject: "Reject",
  manage_users: "Manage Users",
  manage_roles: "Manage Roles",
  settings: "Settings",
}

const ROLE_COLORS: Record<string, string> = {
  "Super Admin": "border-purple-200 bg-purple-50",
  Admin: "border-blue-200 bg-blue-50",
  Manager: "border-indigo-200 bg-indigo-50",
  Requester: "border-gray-200 bg-gray-50",
  Viewer: "border-slate-200 bg-slate-50",
}

const ICON_COLORS: Record<string, string> = {
  "Super Admin": "text-purple-600 bg-purple-100",
  Admin: "text-blue-600 bg-blue-100",
  Manager: "text-indigo-600 bg-indigo-100",
  Requester: "text-gray-600 bg-gray-100",
  Viewer: "text-slate-600 bg-slate-100",
}

export default function AdminRolesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Roles</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Define roles and manage access permissions
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Role
        </Button>
      </div>

      {/* Role cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {mockRoles.map((role) => (
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
                    <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>{role.userCount} users</span>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-xs h-7">
                  Edit
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{role.description}</p>
            </CardHeader>

            <CardContent>
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                Permissions
              </p>
              <div className="flex flex-wrap gap-1.5">
                {role.permissions.map((perm) => (
                  <span
                    key={perm}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-white border border-gray-200 text-gray-700 font-medium"
                  >
                    <Check className="h-3 w-3 text-green-500" />
                    {PERMISSION_LABELS[perm] ?? perm}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
