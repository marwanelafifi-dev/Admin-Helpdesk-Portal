/**
 * Server-side audit log — persists to data/audit-log.json.
 * Used by API routes (user creation, role changes, password resets, etc.)
 * since those run server-side and cannot access localStorage.
 *
 * The Audit Trail page fetches this via GET /api/admin/audit-log.
 */

import fs from "fs"
import path from "path"
import { createHash } from "crypto"

const STORE_PATH = path.join(process.cwd(), "data", "audit-log.json")
const MAX_ENTRIES = 10_000

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
  | "request_created"
  | "request_edited"
  | "login_succeeded"
  | "login_failed"
  | "login_rate_limited"
  | "logout"
  | "access_denied"
  | "page_view"
  | "system_event"
  | "email_sent"
  | "email_failed"
  | "approval_email_resent"

export interface ServerAuditEntry {
  id: string
  timestamp: string
  actor: string       // display name or email of who did it
  actorEmail: string
  action: ServerAuditAction
  targetId: string    // userId / roleId / requestId
  targetTitle: string // user name / role name / request title
  details: string
  category: "user" | "role" | "request" | "authentication" | "access" | "system" | "email" | "company_data"
  outcome?: "success" | "failure" | "denied"
  path?: string
  ipAddress?: string
  userAgent?: string
  functionName?: string
  company?: string
  previousHash?: string
  integrityHash?: string
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

function integrityHash(entry: Omit<ServerAuditEntry, "integrityHash">) {
  // A chained checksum makes accidental alteration or removal evident during
  // review. Production deployments should additionally forward this file to
  // a protected, centralized log service for independent retention.
  return createHash("sha256").update(JSON.stringify(entry)).digest("hex")
}

function sanitize(value: string | undefined) {
  return (value ?? "").replace(/[\r\n\u0000]/g, " ").slice(0, 2_000)
}

export function logServerAudit(
  entry: Omit<ServerAuditEntry, "id" | "timestamp">
): void {
  try {
    const all = readFromDisk()
    const previousHash = all[0]?.integrityHash ?? ""
    const draft: Omit<ServerAuditEntry, "integrityHash"> = {
      ...entry,
      actor: sanitize(entry.actor), actorEmail: sanitize(entry.actorEmail),
      targetId: sanitize(entry.targetId), targetTitle: sanitize(entry.targetTitle), details: sanitize(entry.details),
      path: sanitize(entry.path), ipAddress: sanitize(entry.ipAddress), userAgent: sanitize(entry.userAgent),
      id: `srv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      previousHash,
    }
    const newEntry: ServerAuditEntry = { ...draft, integrityHash: integrityHash(draft) }
    const updated = [newEntry, ...all].slice(0, MAX_ENTRIES)
    writeToDisk(updated)
  } catch {
    // Never throw — audit is best-effort
  }
}

export function getServerAuditLog(): ServerAuditEntry[] {
  return readFromDisk()
}

export function verifyServerAuditLog(entries = readFromDisk()) {
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    const expectedPrevious = entries[i + 1]?.integrityHash ?? ""
    const { integrityHash: storedHash, ...draft } = entry
    if (!storedHash || entry.previousHash !== expectedPrevious || integrityHash(draft) !== storedHash) return { valid: false, invalidEntryId: entry.id }
  }
  return { valid: true, invalidEntryId: null }
}
