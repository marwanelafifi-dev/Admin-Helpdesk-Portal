import fs from "fs"
import path from "path"

export type StoredRole = {
  id: string
  name: string
  description: string | null
  permissions: string[]
  createdAt: string
  updatedAt: string
}

const STORE_PATH = path.join(process.cwd(), "data", "roles.json")

const DEFAULT_ROLES: StoredRole[] = [
  {
    id: "role-super-admin",
    name: "super_admin",
    description: "Full access to all modules and settings",
    permissions: ["*"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "role-admin",
    name: "admin",
    description: "Administrative access to all modules",
    permissions: [
      "page:dashboard","page:feedback-reports","page:tasks","page:all-requests",
      "page:my-requests","page:request-detail","page:shipping","page:shipping-new",
      "page:shipping-sending","page:shipping-receiving","page:hr","page:hr-new",
      "page:maintenance","page:maintenance-new","page:purchase","page:purchase-new",
      "page:event","page:travel","page:admin-users","page:admin-settings",
      "manage_users","manage_tasks","update_status","cancel_request","edit_request",
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "role-manager",
    name: "manager",
    description: "Management access to modules and requests",
    permissions: [
      "page:dashboard","page:feedback-reports","page:tasks","page:all-requests",
      "page:my-requests","page:request-detail","page:shipping","page:shipping-new",
      "page:shipping-sending","page:shipping-receiving","page:hr","page:hr-new",
      "page:maintenance","page:maintenance-new","page:purchase","page:purchase-new",
      "page:event","page:travel","manage_tasks","update_status","cancel_request","edit_request",
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "role-requester",
    name: "requester",
    description: "Can submit and track their own requests",
    permissions: [
      "page:dashboard","page:my-requests","page:request-detail",
      "page:shipping","page:shipping-receiving","page:purchase","page:purchase-new","page:travel",
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "role-viewer",
    name: "viewer",
    description: "Read-only access to dashboard and own requests",
    permissions: ["page:dashboard","page:my-requests","page:request-detail"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

function ensureStore() {
  const dir = path.dirname(STORE_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify(DEFAULT_ROLES, null, 2), "utf-8")
  }
}

export function readRoles(): StoredRole[] {
  try {
    ensureStore()
    return JSON.parse(fs.readFileSync(STORE_PATH, "utf-8"))
  } catch {
    return DEFAULT_ROLES
  }
}

function writeRoles(roles: StoredRole[]) {
  ensureStore()
  fs.writeFileSync(STORE_PATH, JSON.stringify(roles, null, 2), "utf-8")
}

export function findRoleById(id: string): StoredRole | undefined {
  return readRoles().find((r) => r.id === id)
}

export function findRoleByName(name: string): StoredRole | undefined {
  return readRoles().find((r) => r.name.toLowerCase() === name.toLowerCase())
}

export function createRole(data: Omit<StoredRole, "id" | "createdAt" | "updatedAt">): StoredRole {
  const roles = readRoles()
  const newRole: StoredRole = {
    ...data,
    id: `role-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  roles.push(newRole)
  writeRoles(roles)
  return newRole
}

export function updateRole(id: string, data: Partial<Omit<StoredRole, "id" | "createdAt">>): StoredRole | null {
  const roles = readRoles()
  const idx = roles.findIndex((r) => r.id === id)
  if (idx === -1) return null
  roles[idx] = { ...roles[idx], ...data, updatedAt: new Date().toISOString() }
  writeRoles(roles)
  return roles[idx]
}

export function deleteRole(id: string): boolean {
  const roles = readRoles()
  const filtered = roles.filter((r) => r.id !== id)
  if (filtered.length === roles.length) return false
  writeRoles(filtered)
  return true
}
