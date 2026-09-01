import fs from "fs"
import path from "path"

export type StoredRole = {
  id: string
  name: string
  description: string | null
  permissions: string[]
  readModules?: string[]
  readAllModules?: string[]
  createdAt: string
  updatedAt: string
}

const STORE_PATH = path.join(process.cwd(), "data", "roles.json")

const REQUESTER_SI_WARE = "Requester - Si-Ware"
const REQUESTER_BUCHI = "Requester - BUCHI"
const SHIPPING_PERMISSIONS = new Set([
  "page:shipping", "page:shipping-new", "page:shipping-sending", "page:shipping-receiving",
])
const SI_WARE_MODULES = ["shipping", "maintenance", "purchase", "event", "travel", "hr", "general"]
const BUCHI_MODULES = SI_WARE_MODULES.filter((module) => module !== "shipping")

const DEFAULT_ROLES: StoredRole[] = [
  {
    id: "role-super-admin",
    name: "Full Access",
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
      "page:hr-onboarding","page:hr-offboarding",
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
      "page:hr-onboarding","page:hr-offboarding",
      "page:maintenance","page:maintenance-new","page:purchase","page:purchase-new",
      "page:event","page:travel","manage_tasks","update_status","cancel_request","edit_request",
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "role-requester",
    name: REQUESTER_SI_WARE,
    description: "Can submit and track their own requests",
    permissions: [
      "page:dashboard","page:my-requests","page:request-detail",
      "page:shipping","page:shipping-receiving","page:purchase","page:purchase-new","page:travel",
    ],
    readModules: SI_WARE_MODULES,
    readAllModules: [],
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
    const parsed = JSON.parse(fs.readFileSync(STORE_PATH, "utf-8")) as StoredRole[]
    const roles = Array.isArray(parsed) ? parsed : [...DEFAULT_ROLES]
    let changed = false

    let siWare = roles.find((role) => role.id === "role-requester" || role.name.toLowerCase() === "requester")
    if (!siWare) {
      siWare = DEFAULT_ROLES.find((role) => role.id === "role-requester")!
      roles.push({ ...siWare })
      changed = true
    }
    if (siWare.name !== REQUESTER_SI_WARE) {
      siWare.name = REQUESTER_SI_WARE
      changed = true
    }
    if (JSON.stringify(siWare.readModules) !== JSON.stringify(SI_WARE_MODULES)) {
      siWare.readModules = [...SI_WARE_MODULES]
      siWare.readAllModules = []
      changed = true
    }

    if (!roles.some((role) => role.name.toLowerCase() === REQUESTER_BUCHI.toLowerCase())) {
      roles.push({
        ...siWare,
        id: "role-requester-buchi",
        name: REQUESTER_BUCHI,
        description: "BUCHI users can submit and track their own requests (Shipping excluded)",
        permissions: siWare.permissions.filter((permission) => !SHIPPING_PERMISSIONS.has(permission)),
        readModules: [...BUCHI_MODULES],
        readAllModules: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      changed = true
    }

    if (changed) writeRoles(roles)
    return roles
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
