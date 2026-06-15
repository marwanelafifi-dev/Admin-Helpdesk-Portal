/**
 * Server-side audit log — persists to data/audit-log.json.
 * Used by API routes (user creation, role changes, password resets, etc.)
 * since those run server-side and cannot access localStorage.
 *
 * The Audit Trail page fetches this via GET /api/admin/audit-log.
 */

import fs from "fs"
import path from "path"

const STORE_PATH = path.join(process.cwd(), "data", "audit-log.json")
const MAX_ENTRIES = 1000

export type ServerAuditAction =
  | "user_created"
  | "user_updated"
  | "user_deleted"
  | "user_role_changed"
  | "user_password_reset"
  | "role_created"
  | "role_updated"
  | "role_deleted"
  | "company_data_updated"
  | "request_deleted"
  | "request_edited"

export interface ServerAuditEntry {
  id: string
  timestamp: string
  actor: string       // display name or email of who did it
  actorEmail: string
  action: ServerAuditAction
  targetId: string    // userId / roleId / requestId
  targetTitle: string // user name / role name / request title
  details: string
  category: "user" | "role" | "request"
}

function ensureStore() {
  const dir = path.dirname(STORE_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(STORE_PATH)) fs.writeFileSync(STORE_PATH, JSON.stringify([]), "utf-8")
}

function readFromDisk(): ServerAuditEntry[] {
  try {
    ensureStore()
    const raw = fs.readFileSync(STORE_PATH, "utf-8")
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeToDisk(entries: ServerAuditEntry[]) {
  ensureStore()
  fs.writeFileSync(STORE_PATH, JSON.stringify(entries, null, 2), "utf-8")
}

export function logServerAudit(
  entry: Omit<ServerAuditEntry, "id" | "timestamp">
): void {
  try {
    const all = readFromDisk()
    const newEntry: ServerAuditEntry = {
      ...entry,
      id: `srv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
    }
    const updated = [newEntry, ...all].slice(0, MAX_ENTRIES)
    writeToDisk(updated)
  } catch {
    // Never throw — audit is best-effort
  }
}

export function getServerAuditLog(): ServerAuditEntry[] {
  return readFromDisk()
}
