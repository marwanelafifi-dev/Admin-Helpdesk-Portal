/**
 * Core Request Engine — localStorage mock
 *
 * Simulates the backend "requests" table.
 * All writes go to localStorage under `arp_requests`.
 * Swap localStorage calls for Firestore writes when the backend is ready.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type RequestStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "in_progress"
  | "completed"
  | "cancelled"

export type RequestModule =
  | "shipping"
  | "maintenance"
  | "purchase"
  | "event"
  | "travel"

export interface StatusChange {
  status: RequestStatus
  changedBy: string
  changedAt: string
  comment?: string
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
  createdAt: string
  updatedAt: string
}

export interface SubmitMeta {
  title: string
  requesterId?: string
  requesterName?: string
  requesterEmail?: string
}

// ─── Internal constants ───────────────────────────────────────────────────────

const STORAGE_KEY = "arp_requests"
const EMAIL_SERVICE_PATH = "./emailService.js"

const MODULE_PREFIX: Record<string, string> = {
  shipping:    "SHP",
  maintenance: "MNT",
  purchase:    "PRC",
  event:       "EVT",
  travel:      "TRV",
}

// ─── ID generation ───────────────────────────────────────────────────────────

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

// ─── localStorage helpers ─────────────────────────────────────────────────────

function readAll(): EngineRequest[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as EngineRequest[]) : []
  } catch {
    return []
  }
}

function writeAll(requests: EngineRequest[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(requests))
}

// ─── Public API ───────────────────────────────────────────────────────────────

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
    status:         "pending_approval",
    requesterId:    meta.requesterId    ?? "USR-CURRENT",
    requesterName:  meta.requesterName  ?? "Current User",
    requesterEmail: meta.requesterEmail ?? "user@si-ware.com",
    payload,
    statusHistory: [
      {
        status:    "pending_approval",
        changedBy: meta.requesterId ?? "USR-CURRENT",
        changedAt: now,
        comment:   "Submitted for approval",
      },
    ],
    createdAt: now,
    updatedAt: now,
  }

  writeAll([...readAll(), request])
  return request
}

/**
 * saveDraft
 * Saves an incomplete request as "draft" — does not trigger the approval flow.
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
    requesterId:    meta.requesterId    ?? "USR-CURRENT",
    requesterName:  meta.requesterName  ?? "Current User",
    requesterEmail: meta.requesterEmail ?? "user@si-ware.com",
    payload,
    statusHistory: [
      {
        status:    "draft",
        changedBy: meta.requesterId ?? "USR-CURRENT",
        changedAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  }

  writeAll([...readAll(), request])
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

  void import(EMAIL_SERVICE_PATH).then(({ simulateStatusChangeEmail }) => {
    simulateStatusChangeEmail(updated, previousStatus, status)
  }).catch(() => {
    // Email simulation is best-effort in local dev.
  })

  return updated
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

/** Wipes the entire store — useful for testing / dev reset. */
export function clearStore(): void {
  if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY)
}
