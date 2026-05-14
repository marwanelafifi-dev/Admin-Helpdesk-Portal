/**
 * Core Request Engine â€” localStorage mock
 *
 * Simulates the backend "requests" table.
 * All writes go to localStorage under `arp_requests`.
 * Swap localStorage calls for Firestore writes when the backend is ready.
 */

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type RequestStatus =
  | "draft"
  | "new"
  | "on_hold"
  | "in_customs"
  | "in_transit"
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
  /** Module-specific fields live here â€” the "Extension" layer */
  payload: T
  statusHistory: StatusChange[]
  commentHistory: CommentActivity[]
  /** Admin-added CC recipients (editable from request detail page) */
  adminCc: string[]
  createdAt: string
  updatedAt: string
}

export interface SubmitMeta {
  title: string
  requesterId?: string
  requesterName?: string
  requesterEmail?: string
}

// â”€â”€â”€ Internal constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const STORAGE_KEY = "arp_requests"
const EMAIL_SERVICE_PATH = "./emailService.js"

const MODULE_PREFIX: Record<string, string> = {
  shipping:    "SHP",
  maintenance: "MNT",
  purchase:    "PRC",
  event:       "EVT",
  travel:      "TRV",
}

// â”€â”€â”€ ID generation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ localStorage helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Public API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
  return updated
}

/**
 * saveDraft
 * Saves an incomplete request as "draft" â€” does not trigger the approval flow.
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

  // Trigger feedback survey creation when request reaches completed or delivered
  if ((status === "completed" || status === "delivered") && (previousStatus !== "completed" && previousStatus !== "delivered")) {
    void import("./feedbackService").then(({ createFeedbackSurvey }) => {
      createFeedbackSurvey(updated)
    }).catch(() => {
      // Feedback service is best-effort in local dev.
    })
  }

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
  return updated
}

/**
 * getAllCcEmails
 * Returns the merged CC list: payload.ccEmails (from form) + adminCc.
 */
export function getAllCcEmails(request: EngineRequest): string[] {
  const payloadCc = Array.isArray((request.payload as any)?.ccEmails)
    ? ((request.payload as any).ccEmails as string[])
    : []
  const adminCc = Array.isArray(request.adminCc) ? request.adminCc : []
  return Array.from(new Set([...payloadCc, ...adminCc].filter(Boolean)))
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

/** Wipes the entire store â€” useful for testing / dev reset. */
export function clearStore(): void {
  if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY)
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

