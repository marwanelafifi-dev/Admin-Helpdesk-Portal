import fs from "fs"
import path from "path"
import type { CompanyId } from "@/lib/userCompany"

export type StoredRole = {
  id: string
  name: string
  description: string | null
  permissions: string[]
  readModules?: string[]
  readAllModules?: string[]
  createdAt: string
  updatedAt: string
  companyId?: CompanyId
}

const STORE_PATH = path.join(process.cwd(), "data", "roles.json")

const REQUESTER_SI_WARE = "Requester - Si-Ware"
const REQUESTER_BUCHI = "Requester - BUCHI"
const MANAGER = "Manager"
const MANAGER_BUCHI = "Manager - BUCHI"
const SHIPPING_PERMISSIONS = new Set([
  "page:shipping", "page:shipping-new", "page:shipping-sending", "page:shipping-receiving",
])
const SI_WARE_MODULES = ["shipping", "maintenance", "purchase", "event", "travel", "hr", "general"]
const BUCHI_MODULES = SI_WARE_MODULES.filter((module) => module !== "shipping")
const FINANCE_MODULES = ["finance_reimbursement", "finance_travel_reimbursement", "finance_invoice_payment"]
const PEOPLE_MODULES = ["hr_general", "hr_letter", "hr_travel_letter"]
const ALL_FUNCTION_MODULES = [...SI_WARE_MODULES, ...FINANCE_MODULES, ...PEOPLE_MODULES]

const FINANCE_PAGE_PERMISSIONS = [
  "page:finance-dashboard", "page:finance-services", "page:finance-reimbursement",
  "page:finance-travel", "page:finance-invoices", "page:finance-my-requests",
  "page:finance-team-requests", "page:finance-all-requests", "page:finance-tasks",
  "page:finance-sla-reminders", "page:finance-feedback", "page:finance-request-detail",
]
const PEOPLE_PAGE_PERMISSIONS = [
  "page:hr-dashboard", "page:hr-services", "page:hr-general", "page:hr-letter-request",
  "page:hr-my-requests", "page:hr-team-requests", "page:hr-all-requests",
  "page:hr-tasks", "page:hr-feedback", "page:hr-request-detail",
]
const SHARED_REQUEST_PAGE_PERMISSIONS = ["page:my-requests", "page:team-requests", "page:request-detail"]
const MANAGER_PERMISSIONS = [
  "create", "read", "read_own", "update", "update_status", "view_details", "activity",
  "manage_cc", "assign_requests", "manage_tasks", "edit_request", "cancel_request",
  ...SHARED_REQUEST_PAGE_PERMISSIONS, ...FINANCE_PAGE_PERMISSIONS, ...PEOPLE_PAGE_PERMISSIONS,
]

function addMissing<T>(current: T[] | undefined, required: T[]) {
  return [...new Set([...(current ?? []), ...required])]
}

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

    for (const role of roles) {
      if ("intranetOwners" in role) {
        delete (role as StoredRole & { intranetOwners?: unknown }).intranetOwners
        changed = true
      }
      const activePermissions = role.permissions.filter((permission) => !permission.startsWith("page:intranet-"))
      if (activePermissions.length !== role.permissions.length) {
        role.permissions = activePermissions
        changed = true
      }
      const expectedCompany: CompanyId = role.name.toLowerCase().includes("buchi") ? "buchi" : "si_ware"
      if (!role.companyId) {
        role.companyId = expectedCompany
        changed = true
      }
    }

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
        companyId: "buchi",
      })
      changed = true
    }

    if (!roles.some((role) => role.name.toLowerCase() === MANAGER_BUCHI.toLowerCase())) {
      const sourceManager = roles.find((role) => role.id === "role-manager")
        ?? roles.find((role) => role.name.toLowerCase() === "manager")
      const now = new Date().toISOString()
      roles.push({
        id: "role-manager-buchi",
        name: MANAGER_BUCHI,
        description: "BUCHI management access to team requests (Shipping excluded)",
        permissions: (sourceManager?.permissions ?? []).filter((permission) => !SHIPPING_PERMISSIONS.has(permission)),
        readModules: (sourceManager?.readModules ?? BUCHI_MODULES).filter((module) => module !== "shipping"),
        readAllModules: (sourceManager?.readAllModules ?? BUCHI_MODULES).filter((module) => module !== "shipping"),
        createdAt: now,
        updatedAt: now,
        companyId: "buchi",
      })
      changed = true
    }

    // Function portals have dedicated pages, request modules, and work queues.
    // Keep the seeded roles in sync when a portal page is introduced, without
    // removing any permissions an administrator has intentionally added.
    const updateFunctionRole = (name: string, pagePermissions: string[], modules: string[], canReadAll = true) => {
      const role = roles.find((item) => item.name.toLowerCase() === name.toLowerCase())
      if (!role) return
      const permissions = addMissing(role.permissions, [
        "create", "read_own", "update", "update_status", "delete", "view_details", "activity",
        "manage_cc", "assign_requests", "edit_request", "cancel_request",
        ...SHARED_REQUEST_PAGE_PERMISSIONS, ...pagePermissions,
      ])
      if (canReadAll) permissions.push("read")
      const readModules = addMissing(role.readModules, modules)
      const readAllModules = canReadAll ? addMissing(role.readAllModules, modules) : (role.readAllModules ?? [])
      if (JSON.stringify(permissions) !== JSON.stringify(role.permissions)
        || JSON.stringify(readModules) !== JSON.stringify(role.readModules)
        || JSON.stringify(readAllModules) !== JSON.stringify(role.readAllModules)) {
        role.permissions = permissions
        role.readModules = readModules
        role.readAllModules = readAllModules
        role.updatedAt = new Date().toISOString()
        changed = true
      }
    }

    updateFunctionRole("Finance Team", FINANCE_PAGE_PERMISSIONS, FINANCE_MODULES)
    updateFunctionRole("People Team", PEOPLE_PAGE_PERMISSIONS, PEOPLE_MODULES)

    // Requesters can open their own shared request list from either function,
    // as well as the request forms belonging to those functions.
    updateFunctionRole(REQUESTER_SI_WARE, [...FINANCE_PAGE_PERMISSIONS.filter((p) => !p.includes("team-") && !p.includes("all-") && !p.includes("tasks") && !p.includes("sla-")), ...PEOPLE_PAGE_PERMISSIONS.filter((p) => !p.includes("team-") && !p.includes("all-") && !p.includes("tasks") && !p.includes("feedback"))], [...FINANCE_MODULES, ...PEOPLE_MODULES], false)
    updateFunctionRole(REQUESTER_BUCHI, [...FINANCE_PAGE_PERMISSIONS.filter((p) => !p.includes("team-") && !p.includes("all-") && !p.includes("tasks") && !p.includes("sla-")), ...PEOPLE_PAGE_PERMISSIONS.filter((p) => !p.includes("team-") && !p.includes("all-") && !p.includes("tasks") && !p.includes("feedback"))], [...FINANCE_MODULES, ...PEOPLE_MODULES], false)

    let manager = roles.find((role) => role.name.toLowerCase() === MANAGER.toLowerCase())
    if (!manager) {
      const now = new Date().toISOString()
      manager = {
        id: "role-manager-all-functions",
        name: MANAGER,
        description: "Can view and manage their team requests across all functions",
        permissions: [...MANAGER_PERMISSIONS],
        readModules: [...ALL_FUNCTION_MODULES],
        readAllModules: [...ALL_FUNCTION_MODULES],
        createdAt: now,
        updatedAt: now,
        companyId: "si_ware",
      }
      roles.push(manager)
      changed = true
    } else {
      const permissions = addMissing(manager.permissions, MANAGER_PERMISSIONS)
      const readModules = addMissing(manager.readModules, ALL_FUNCTION_MODULES)
      const readAllModules = addMissing(manager.readAllModules, ALL_FUNCTION_MODULES)
      if (JSON.stringify(permissions) !== JSON.stringify(manager.permissions)
        || JSON.stringify(readModules) !== JSON.stringify(manager.readModules)
        || JSON.stringify(readAllModules) !== JSON.stringify(manager.readAllModules)) {
        manager.permissions = permissions
        manager.readModules = readModules
        manager.readAllModules = readAllModules
        manager.updatedAt = new Date().toISOString()
        changed = true
      }
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
