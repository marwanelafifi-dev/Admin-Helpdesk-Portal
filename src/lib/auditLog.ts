/**
 * Lightweight client-side audit event log.
 *
 * Writes to localStorage key `arp_audit_log`. Captures events that are NOT
 * already covered by the existing request/status/comment history scraped by
 * the Audit Trail page — specifically: permanent deletions, field edits, and
 * submission errors.
 *
 * Capped at MAX_ENTRIES (500) to prevent unbounded localStorage growth.
 * Plain module — no "use client" directive needed; only uses localStorage.
 */

const STORAGE_KEY = "arp_audit_log"
const MAX_ENTRIES = 500

export interface AuditEvent {
  id: string
  timestamp: string
  actor: string
  actorEmail: string
  action: "request_deleted" | "request_edited" | "request_assigned" | "submission_error"
    | "database_backup" | "database_restore" | "database_clear"
    | "maintenance_toggled" | "maintenance_message_updated" | "force_signout_all"
  targetId: string
  targetTitle: string
  module: string
  details: string
}

export function logAuditEvent(
  event: Omit<AuditEvent, "id" | "timestamp">
): void {
  if (typeof window === "undefined") return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const existing: AuditEvent[] = raw ? (JSON.parse(raw) as AuditEvent[]) : []

    const newEvent: AuditEvent = {
      ...event,
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
    }

    // Prepend newest first; trim to cap
    const updated = [newEvent, ...existing].slice(0, MAX_ENTRIES)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // Never throw — audit logging is best-effort
  }
}

export function getAuditEvents(): AuditEvent[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AuditEvent[]) : []
  } catch {
    return []
  }
}
