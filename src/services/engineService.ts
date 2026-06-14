/**
 * Core Request Engine â€" localStorage mock
 *
 * Simulates the backend "requests" table.
 * All writes go to localStorage under `arp_requests`.
 * Swap localStorage calls for Firestore writes when the backend is ready.
 */

import { logAuditEvent } from "@/lib/auditLog"

// â"€â"€â"€ Types â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

export type RequestStatus =
  | "draft"
  | "new"
  | "on_hold"
  | "in_customs"
  | "in_transit"
  | "awaiting_approval"
  | "delivered"
  | "completed"
  | "cancelled"

export type RequestModule =
  | "shipping"
  | "maintenance"
  | "purchase"
  | "event"
  | "travel"
  | "hr"
  | "general"

export interface StatusChange {
  status: RequestStatus
  changedBy: string
  changedAt: string
  comment?: string
}

export interface CommentActivity {
  id: string
  action: 'comment_added'
  changedBy: string
  changedAt: string
}

export interface EngineRequest<T = Record<string, unknown>> {
  id: string
  module: RequestModule | string
  title: string
  status: RequestStatus
  requesterId: string
  requesterName: string
  requesterEmail: string
  /** Module-specific fields live here — the "Extension" layer */
  payload: T
  statusHistory: StatusChange[]
  commentHistory: CommentActivity[]
  /** Admin-added CC recipients (editable from request detail page) */
  adminCc: string[]
  /** Currently assigned Administration Team member, if any. */
  assignedToId?: string | null
  assignedToName?: string | null
  assignedToEmail?: string | null
  createdAt: string
  updatedAt: string
}

export interface SubmitMeta {
  title: string
  requesterId?: string
  requesterName?: string
  requesterEmail?: string
}

// â"€â"€â"€ Internal constants â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

const STORAGE_KEY = "arp_requests"
const EMAIL_SERVICE_PATH = "./emailService.js"

const MODULE_PREFIX: Record<string, string> = {
  shipping:    "SHP",
  maintenance: "MNT",
  purchase:    "PRC",
  event:       "EVT",
  travel:      "TRV",
  hr:          "HR",
  general:     "GEN",
}

// â"€â"€â"€ ID generation â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

function generateId(module: string): string {
  const prefix = MODULE_PREFIX[module] ?? "REQ"
  const year = new Date().getFullYear()
  const pattern = new RegExp(`^${prefix}-${year}-(\\d{4})$`)
  const currentMax = readAll().reduce((max, req) => {
    const match = req.id.match(pattern)
    if (!match) return max
    const n = Number(match[1])
    return Number.isFinite(n) ? Math.max(max, n) : max
  }, 0)
  const next = String(currentMax + 1).padStart(4, "0")
  return `${prefix}-${year}-${next}`
}

// ─── localStorage helpers ────────────────────────────────────────────────────

// In-memory read cache — avoids repeated JSON.parse of the same large string.
// Invalidated on every write so reads always reflect current state.
let _readCache: EngineRequest[] | null = null
let _readCacheRaw = ""

function readAll(): EngineRequest[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? ""
    if (_readCache && raw === _readCacheRaw) return _readCache
    _readCacheRaw = raw
    _readCache = raw ? (JSON.parse(raw) as EngineRequest[]) : []
    return _readCache
  } catch {
    _readCache = []
    return []
  }
}

function stripAttachments(requests: EngineRequest[]): EngineRequest[] {
  return requests.map((r) => {
    const payload = r.payload as Record<string, unknown>
    if (!payload?.attachments) return r
    return { ...r, payload: { ...payload, attachments: [] } }
  })
}

function writeAll(requests: EngineRequest[]): void {
  if (typeof window === "undefined") return
  // Invalidate read cache so the next readAll() picks up fresh data.
  _readCache = null
  _readCacheRaw = ""
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests))
  } catch (e) {
    // QuotaExceededError — attachments (base64 data URLs) are the usual culprit.
    // The server already holds the full payload via pushToServer, so it's safe
    // to strip attachment data from the local cache and retry.
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stripAttachments(requests)))
    } catch {
      // Still full — wipe the cache entirely. The next syncFromServer() pull
      // will restore all requests from the server.
      localStorage.removeItem(STORAGE_KEY)
    }
  }
  try { window.dispatchEvent(new Event("arp:storage")) } catch {}
}

/**
 * Server sync helpers — keep localStorage in step with the shared server
 * store at /api/requests so users see each others' submissions.
 *
 * Reads stay synchronous (the existing getRequests / getRequestsByModule
 * APIs are called from rendering paths and we don't want to refactor every
 * caller to async). To make that work we eagerly pull the server state on
 * dashboard mount (via useEngineSync below) and overwrite the local cache,
 * so the next sync read returns the fresh data.
 *
 * Writes still hit localStorage synchronously for instant UI feedback, then
 * fire a background POST so the change reaches the server. If the network
 * call fails (offline, etc.) the local copy diverges until the next pull —
 * acceptable trade-off given there's no real conflict resolution in this
 * mock backend.
 */
// IDs queued for retry when pushToServer fails transiently.
// Also persisted to localStorage so a page reload can retry failed pushes.
const _pendingPush = new Map<string, EngineRequest>()
const PENDING_KEY = "arp_pending_push"

function loadPending(): void {
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    if (!raw) return
    const entries: [string, EngineRequest][] = JSON.parse(raw)
    entries.forEach(([id, req]) => _pendingPush.set(id, req))
  } catch {}
}

function savePending(): void {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify([..._pendingPush.entries()]))
  } catch {}
}

// Retry any requests that failed to push in a previous session.
export async function retryPendingPushes(): Promise<void> {
  if (typeof window === "undefined") return
  loadPending()
  if (_pendingPush.size === 0) return
  const entries = [..._pendingPush.entries()]
  for (const [, req] of entries) {
    await pushToServer(req)
  }
  savePending()
}

async function pushToServer(request: EngineRequest): Promise<void> {
  if (typeof window === "undefined") return
  // Track as pending so syncFromServer preserves it and retries survive page reloads.
  _pendingPush.set(request.id, request)
  savePending()
  const ATTEMPTS = 3
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request }),
      })
      if (!res.ok) {
        if (attempt < ATTEMPTS - 1) { await new Promise(r => setTimeout(r, (attempt + 1) * 2000)); continue }
        return
      }
      const json = await res.json()
      const saved = json?.request as EngineRequest | undefined
      _pendingPush.delete(request.id)
      savePending()
      if (!saved) return

      // Mirror server-stamped assignee back to localStorage.
      if (saved.assignedToId && saved.assignedToId !== request.assignedToId) {
        const local = readAll()
        const idx = local.findIndex((r) => r.id === saved.id)
        if (idx >= 0) {
          local[idx] = { ...local[idx], ...saved }
          writeAll(local)
        }
      }
      return
    } catch {
      if (attempt < ATTEMPTS - 1) await new Promise(r => setTimeout(r, (attempt + 1) * 2000))
    }
  }
  // Push failed after all retries — leave in _pendingPush so syncFromServer preserves it.
}

/**
 * Evict any stored comments for a request ID. Called when a brand-new
 * request is created, because request IDs reset to *-0001 after a clear
 * and would otherwise inherit ghost comments from the previous request
 * that owned the same ID.
 */
function clearCommentsForId(requestId: string): void {
  if (typeof window === "undefined") return
  fetch(`/api/requests/comments?requestId=${encodeURIComponent(requestId)}`, {
    method: "DELETE",
  }).catch(() => {
    // Best-effort.
  })
}

/**
 * Fetch all requests from the server and overwrite the local cache.
 * Resolves after the cache is populated. Safe to call repeatedly.
 */
export async function syncFromServer(): Promise<void> {
  if (typeof window === "undefined") return
  try {
    const res = await fetch("/api/requests", { cache: "no-store" })
    if (!res.ok) return
    const json = await res.json()
    const remote = Array.isArray(json?.data) ? (json.data as EngineRequest[]) : []

    // Merge strategy: server is authoritative for everything it knows about.
    // Preserve any local records that are still pending a push (not yet on server)
    // so a slow network doesn't cause a user to lose their own just-submitted request.
    const remoteIds = new Set(remote.map((r) => r.id))
    const localOnly = readAll().filter(
      (r) => !remoteIds.has(r.id) && _pendingPush.has(r.id)
    )
    const merged = [...remote, ...localOnly]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
    try { window.dispatchEvent(new Event("arp:storage")) } catch {}
  } catch {
    // Network errors leave the cache untouched.
  }
}

// â"€â"€â"€ Public API â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

/**
 * submitRequest
 * Creates a new request in "pending_approval" status and persists it.
 * Returns the full saved request (including the generated ID).
 */
export function submitRequest<T extends Record<string, unknown>>(
  module: RequestModule | string,
  payload: T,
  meta: SubmitMeta
): EngineRequest<T> {
  const id  = generateId(module)
  const now = new Date().toISOString()

  const request: EngineRequest<T> = {
    id,
    module,
    title:          meta.title,
    status:         "new",
    requesterId:    meta.requesterId    ?? "USR-UNKNOWN",
    requesterName:  meta.requesterName  ?? "Unknown User",
    requesterEmail: meta.requesterEmail ?? "",
    payload,
    statusHistory: [
      {
        status:    "new",
        changedBy: meta.requesterId ?? "USR-CURRENT",
        changedAt: now,
        comment:   "Submitted",
      },
    ],
    commentHistory: [],
    adminCc: [],
    createdAt: now,
    updatedAt: now,
  }

  writeAll([...readAll(), request])
  pushToServer(request)
  clearCommentsForId(id)
  return request
}

/**
 * updateRequest
 * Updates an existing request's payload and metadata.
 * Returns the updated request, or null if the ID was not found.
 */
export function updateRequest<T extends Record<string, unknown>>(
  id: string,
  payload: T,
  meta: Partial<SubmitMeta>
): EngineRequest<T> | null {
  const requests = readAll()
  const index = requests.findIndex((r) => r.id === id)
  if (index === -1) return null

  const now = new Date().toISOString()
  const request = requests[index]

  const updated: EngineRequest<T> = {
    ...request,
    title: meta.title ?? request.title,
    payload,
    updatedAt: now,
  } as EngineRequest<T>

  requests[index] = updated
  writeAll(requests)
  pushToServer(updated)

  try {
    logAuditEvent({
      actor: meta.requesterName ?? "Unknown",
      actorEmail: meta.requesterEmail ?? "",
      action: "request_edited",
      targetId: id,
      targetTitle: meta.title ?? updated.title,
      module: updated.module,
      details: "Request fields updated",
    })
  } catch {}

  return updated
}

/**
 * saveDraft
 * Saves an incomplete request as "draft" â€" does not trigger the approval flow.
 */
export function saveDraft<T extends Record<string, unknown>>(
  module: RequestModule | string,
  payload: T,
  meta: SubmitMeta
): EngineRequest<T> {
  const id  = generateId(module)
  const now = new Date().toISOString()

  const request: EngineRequest<T> = {
    id,
    module,
    title:          meta.title || "(Untitled draft)",
    status:         "draft",
    requesterId:    meta.requesterId    ?? "USR-UNKNOWN",
    requesterName:  meta.requesterName  ?? "Unknown User",
    requesterEmail: meta.requesterEmail ?? "",
    payload,
    statusHistory: [
      {
        status:    "draft",
        changedBy: meta.requesterId ?? "USR-CURRENT",
        changedAt: now,
      },
    ],
    commentHistory: [],
    adminCc: [],
    createdAt: now,
    updatedAt: now,
  }

  writeAll([...readAll(), request])
  pushToServer(request)
  clearCommentsForId(id)
  return request
}

/**
 * updateStatus
 * Records a status transition on an existing request.
 * Returns the updated request, or null if the ID was not found.
 */
export function updateStatus(
  id: string,
  status: RequestStatus,
  changedBy: string,
  comment?: string
): EngineRequest | null {
  const requests = readAll()
  const index    = requests.findIndex((r) => r.id === id)
  if (index === -1) return null

  const now     = new Date().toISOString()
  const previousStatus = requests[index].status
  const updated = {
    ...requests[index],
    status,
    updatedAt: now,
    statusHistory: [
      ...requests[index].statusHistory,
      { status, changedBy, changedAt: now, comment },
    ],
  }

  requests[index] = updated
  writeAll(requests)
  pushToServer(updated)

  void import(EMAIL_SERVICE_PATH).then(({ simulateStatusChangeEmail }) => {
    simulateStatusChangeEmail(updated, previousStatus, status)
  }).catch(() => {
    // Email simulation is best-effort in local dev.
  })

  // Trigger feedback survey creation when request reaches completed or delivered
  if ((status === "completed" || status === "delivered") && (previousStatus !== "completed" && previousStatus !== "delivered")) {
    void import("./feedbackService").then(({ createFeedbackSurvey }) => {
      createFeedbackSurvey(updated)
    }).catch(() => {
      // Feedback service is best-effort in local dev.
    })
  }

  // Purchase Approval workflow: when a Purchase request enters
  // "Awaiting Approval", fire the special approval email to the selected
  // Direct Manager with one-click Approve / Reject buttons.
  if (
    typeof window !== "undefined" &&
    updated.module === "purchase" &&
    status === "awaiting_approval" &&
    previousStatus !== "awaiting_approval"
  ) {
    fetch(`/api/requests/${encodeURIComponent(id)}/send-approval-email`, {
      method: "POST",
    }).catch(() => {
      // Best-effort. The admin can resend from the UI if needed.
    })
  }

  return updated
}

/**
 * assignRequest
 * Sets (or clears) the assignee on an existing request. Pass `null` for
 * assignee to clear the assignment. Returns the updated request, or null if
 * the ID was not found.
 */
export function assignRequest(
  id: string,
  assignee: { id: string; name: string; email: string } | null,
): EngineRequest | null {
  const requests = readAll()
  const index = requests.findIndex((r) => r.id === id)
  if (index === -1) return null

  const updated: EngineRequest = {
    ...requests[index],
    assignedToId: assignee?.id ?? null,
    assignedToName: assignee?.name ?? null,
    assignedToEmail: assignee?.email ?? null,
    updatedAt: new Date().toISOString(),
  }

  requests[index] = updated
  writeAll(requests)
  pushToServer(updated)

  try {
    logAuditEvent({
      actor: assignee?.name ?? "System",
      actorEmail: assignee?.email ?? "",
      action: "request_assigned",
      targetId: id,
      targetTitle: updated.title,
      module: updated.module,
      details: assignee
        ? `Assigned to ${assignee.name}`
        : "Assignment cleared",
    })
  } catch {}

  return updated
}

/**
 * recordCommentActivity
 * Records a comment addition on an existing request's activity timeline.
 * Returns the updated request, or null if the ID was not found.
 */
export function recordCommentActivity(
  id: string,
  changedBy: string
): EngineRequest | null {
  const requests = readAll()
  const index    = requests.findIndex((r) => r.id === id)
  if (index === -1) return null

  const now     = new Date().toISOString()
  const commentId = `CMT-${Date.now()}`

  const updated = {
    ...requests[index],
    updatedAt: now,
    commentHistory: [
      ...(requests[index].commentHistory || []),
      { id: commentId, action: 'comment_added' as const, changedBy, changedAt: now },
    ],
  }

  requests[index] = updated
  writeAll(requests)
  pushToServer(updated)

  return updated
}

/**
 * updateAdminCc
 * Replaces the admin-managed CC list on a request.
 */
export function updateAdminCc(id: string, adminCc: string[]): EngineRequest | null {
  const requests = readAll()
  const index = requests.findIndex((r) => r.id === id)
  if (index === -1) return null

  const updated = {
    ...requests[index],
    adminCc,
    updatedAt: new Date().toISOString(),
  }

  requests[index] = updated
  writeAll(requests)
  pushToServer(updated)
  return updated
}

/**
 * getAllCcEmails
 * Returns the merged CC list: payload.ccEmails (from form) + adminCc.
 */
export function getAllCcEmails(request: EngineRequest): string[] {
  const payload = (request.payload ?? {}) as Record<string, any>
  const payloadCc = Array.isArray(payload.ccEmails) ? (payload.ccEmails as string[]) : []
  const adminCc = Array.isArray(request.adminCc) ? request.adminCc : []

  // Direct Manager — included on the Cc list of every email for this
  // request so they stay in the loop on status changes, comments, etc.
  // Shipping stores it as approvers.directManager.email; Purchase / HR
  // store the manager's NAME under payload.directManager.
  const managerEmail: string[] = []
  const shippingManagerEmail = payload?.approvers?.directManager?.email
  if (typeof shippingManagerEmail === "string" && shippingManagerEmail.trim()) {
    managerEmail.push(shippingManagerEmail.trim())
  }
  const otherManagerName = payload?.directManager
  if (typeof otherManagerName === "string" && otherManagerName.trim()) {
    // Resolve via Company Data on the client. The lookup is safe on the
    // server too — getManagerEmail just returns undefined when window is
    // missing, in which case we skip.
    try {
      // Lazy import to avoid pulling client-only code on the server side.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getManagerEmail } = require("@/lib/companyDataStore") as typeof import("@/lib/companyDataStore")
      const resolved = getManagerEmail(otherManagerName)
      if (resolved) managerEmail.push(resolved)
    } catch {
      // server-side fallback — companyDataStore relies on localStorage
      // which doesn't exist on the server. The /api/notifications/email
      // route can resolve via a server-side store if needed in future.
    }
  }

  return Array.from(new Set([...payloadCc, ...adminCc, ...managerEmail].filter(Boolean)))
}

/** Returns every request in the store. */
export function getRequests(): EngineRequest[] {
  return readAll()
}

/** Returns requests filtered by module. */
export function getRequestsByModule(module: string): EngineRequest[] {
  return readAll().filter((r) => r.module === module)
}

/** Returns a single request by ID, or undefined if not found. */
export function getRequestById(id: string): EngineRequest | undefined {
  return readAll().find((r) => r.id === id)
}

/** Wipes the entire store â€" useful for testing / dev reset. */
export function clearStore(): void {
  if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY)
}

/**
 * Permanently delete a single request — from localStorage, from the
 * server's data/requests.json, and from comments.json (cascade). Returns
 * true if the local cache changed. The server call is fire-and-forget
 * but normally completes within the same tick.
 */
export function deleteRequestPermanently(id: string): boolean {
  if (typeof window === "undefined") return false
  const requests = readAll()
  const req = requests.find((r) => r.id === id)
  const next = requests.filter((r) => r.id !== id)
  const changed = next.length !== requests.length
  if (changed) {
    writeAll(next)
    if (req) {
      try {
        logAuditEvent({
          actor: "System",
          actorEmail: "",
          action: "request_deleted",
          targetId: id,
          targetTitle: req.title,
          module: req.module,
          details: `Request permanently deleted (was ${req.status})`,
        })
      } catch {}
    }
  }
  // Save a snapshot to the recycle bin before the server deletes it.
  // Fire-and-forget — the server DELETE handler also saves the snapshot,
  // but this client-side call ensures the snapshot exists even if the
  // server DELETE races ahead.
  if (req) {
    fetch("/api/requests/deleted", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request: req, deletedBy: "User" }),
    }).catch(() => {})
  }
  // Server delete + comment cascade in parallel.
  fetch(`/api/requests?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {})
  fetch(`/api/requests/comments?requestId=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {})
  return changed
}

const PROD_VERSION = "v1-prod"
const MOCK_VERSION_KEY = "arp_mock_version"

/** Clears any old mock/dev data and marks the store as production-ready. */
export function initializeMockData(): void {
  if (typeof window === "undefined") return
  const storedVersion = localStorage.getItem(MOCK_VERSION_KEY)
  if (storedVersion === PROD_VERSION) return
  // Wipe all previous mock data on first production boot
  localStorage.removeItem(STORAGE_KEY)
  localStorage.setItem(MOCK_VERSION_KEY, PROD_VERSION)
}

