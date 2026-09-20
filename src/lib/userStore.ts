import fs from "fs"
import path from "path"
import { getCompanyFromEmail, getDefaultRequesterRoleForEmail, type CompanyId } from "@/lib/userCompany"
import { roleToFunctionId, type FunctionId } from "@/lib/functionRegistry"

export type StoredUser = {
  id: string
  email: string
  name: string
  role: string
  image: string | null
  active: boolean
  createdAt: string
  provider: "google" | "credentials"
  companyId?: CompanyId
  companyName?: "Si-Ware Systems" | "BUCHI"
  department?: string
  passwordHash?: string
  /**
   * If true, new requests owned by this user's function are auto-assigned to
   * this user. Each function can have one default assignee; the user's team
   * role identifies the function (Administration, People/HR, or Finance).
   */
  defaultAssignee?: boolean
  /** Credential users must change their temporary password before using the portal. */
  mustChangePassword?: boolean
}

const STORE_PATH = path.join(process.cwd(), "data", "users.json")

function ensureStore() {
  const dir = path.dirname(STORE_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(STORE_PATH)) fs.writeFileSync(STORE_PATH, JSON.stringify([]), "utf-8")
}

export function readUsers(): StoredUser[] {
  try {
    ensureStore()
    const users = JSON.parse(fs.readFileSync(STORE_PATH, "utf-8")) as StoredUser[]
    let changed = false
    for (const user of users) {
      if (["requester", "Requester"].includes(user.role)) {
        user.role = getDefaultRequesterRoleForEmail(user.email)
        changed = true
      }
      const company = getCompanyFromEmail(user.email)
      if (company && (user.companyId !== company.id || user.companyName !== company.name)) {
        user.companyId = company.id
        user.companyName = company.name
        changed = true
      }
    }
    if (changed) writeUsers(users)
    return users
  } catch {
    return []
  }
}

function writeUsers(users: StoredUser[]) {
  ensureStore()
  fs.writeFileSync(STORE_PATH, JSON.stringify(users, null, 2), "utf-8")
}

export function findUserByEmail(email: string): StoredUser | undefined {
  return readUsers().find((u) => u.email.toLowerCase() === email.toLowerCase())
}

export function findUserById(id: string): StoredUser | undefined {
  return readUsers().find((u) => u.id === id)
}

// First-time login: create user with requester role
// Returns existing user if already registered
export function upsertGoogleUser(email: string, name: string, image: string | null): StoredUser {
  const users = readUsers()
  const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase())
  if (existing) return existing

  const company = getCompanyFromEmail(email)
  const newUser: StoredUser = {
    id: `USR-${Date.now()}`,
    email: email.toLowerCase(),
    name,
    role: getDefaultRequesterRoleForEmail(email),
    image,
    active: true,
    createdAt: new Date().toISOString(),
    provider: "google",
    ...(company && { companyId: company.id, companyName: company.name }),
  }
  users.push(newUser)
  writeUsers(users)
  return newUser
}

export function updateUserRole(id: string, role: string): StoredUser | null {
  const users = readUsers()
  const idx = users.findIndex((u) => u.id === id)
  if (idx === -1) return null
  users[idx].role = role
  writeUsers(users)
  return users[idx]
}

export function updateUser(id: string, data: Partial<Omit<StoredUser, "id" | "createdAt">>): StoredUser | null {
  const users = readUsers()
  const idx = users.findIndex((u) => u.id === id)
  if (idx === -1) return null
  const roleChanged = data.role !== undefined && data.role !== users[idx].role
  const becomesInactive = data.active === false
  users[idx] = {
    ...users[idx],
    ...data,
    ...((roleChanged || becomesInactive) && { defaultAssignee: false }),
  }
  writeUsers(users)
  return users[idx]
}

/**
 * Mark a single user as the default assignee for one support function. Clears
 * the flag from other users in that function only, allowing Administration,
 * HR, and Finance to each keep an independent default. Pass `null` to clear
 * the selected function's default.
 */
export function setDefaultAssignee(id: string | null, functionId: FunctionId = "admin"): StoredUser | null {
  const users = readUsers()
  let next: StoredUser | null = null
  for (const u of users) {
    if (roleToFunctionId(u.role) !== functionId) continue
    if (id && u.id === id) {
      u.defaultAssignee = true
      next = u
    } else if (u.defaultAssignee) {
      u.defaultAssignee = false
    }
  }
  writeUsers(users)
  return next
}

export function getDefaultAssignee(functionId: FunctionId = "admin"): StoredUser | null {
  return readUsers().find((u) => u.active && roleToFunctionId(u.role) === functionId && u.defaultAssignee) ?? null
}

export function deleteUser(id: string): boolean {
  const users = readUsers()
  const filtered = users.filter((u) => u.id !== id)
  if (filtered.length === users.length) return false
  writeUsers(filtered)
  return true
}

export function createUser(data: Omit<StoredUser, "id" | "createdAt">): StoredUser {
  const users = readUsers()
  const company = getCompanyFromEmail(data.email)
  const newUser: StoredUser = {
    ...data,
    id: `USR-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    ...(company && { companyId: company.id, companyName: company.name }),
  }
  users.push(newUser)
  writeUsers(users)
  return newUser
}
