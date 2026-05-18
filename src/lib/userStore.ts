import fs from "fs"
import path from "path"

export type StoredUser = {
  id: string
  email: string
  name: string
  role: string
  image: string | null
  active: boolean
  createdAt: string
  provider: "google" | "credentials"
  passwordHash?: string
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
    return JSON.parse(fs.readFileSync(STORE_PATH, "utf-8"))
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

  const newUser: StoredUser = {
    id: `USR-${Date.now()}`,
    email: email.toLowerCase(),
    name,
    role: "Requester",
    image,
    active: true,
    createdAt: new Date().toISOString(),
    provider: "google",
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
  users[idx] = { ...users[idx], ...data }
  writeUsers(users)
  return users[idx]
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
  const newUser: StoredUser = {
    ...data,
    id: `USR-${Date.now()}`,
    createdAt: new Date().toISOString(),
  }
  users.push(newUser)
  writeUsers(users)
  return newUser
}
