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

function ensureStore() {
  const dir = path.dirname(STORE_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, "[]\n", "utf-8")
  }
}

export function readRoles(): StoredRole[] {
  try {
    ensureStore()
    const parsed = JSON.parse(fs.readFileSync(STORE_PATH, "utf-8")) as StoredRole[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
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
