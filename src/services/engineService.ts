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
  | "new"
  | "on_hold"
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
    status:         "new",
    requesterId:    meta.requesterId    ?? "USR-CURRENT",
    requesterName:  meta.requesterName  ?? "Current User",
    requesterEmail: meta.requesterEmail ?? "user@si-ware.com",
    payload,
    statusHistory: [
      {
        status:    "new",
        changedBy: meta.requesterId ?? "USR-CURRENT",
        changedAt: now,
        comment:   "Submitted",
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

const MOCK_VERSION = "v5"
const MOCK_VERSION_KEY = "arp_mock_version"

/** Initializes mock data for development. */
export function initializeMockData(): void {
  if (typeof window === "undefined") return
  const storedVersion = localStorage.getItem(MOCK_VERSION_KEY)
  if (storedVersion === MOCK_VERSION) return // Already on current version
  // Reset stale data when version changes
  localStorage.removeItem(STORAGE_KEY)

  const now = new Date()
  const mockRequests: EngineRequest[] = [
    {
      id: "SHP-2026-0001",
      module: "shipping",
      title: "DHL shipment to Dubai warehouse",
      status: "in_transit",
      requesterId: "USR-001",
      requesterName: "Marwan Elafifi",
      requesterEmail: "marwan.elafifi@si-ware.com",
      payload: {
        supplier: "DHL",
        costCenter: "Operations",
        poNumber: "PO-2026-1001",
        carrier: "DHL",
        trackingNumber: "1Z999AA10123456784",
        description: "Electronics shipment to Dubai facility",
        expectedDeliveryDate: "2026-04-30",
      },
      statusHistory: [
        { status: "new", changedBy: "USR-001", changedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(), comment: "Submitted" },
        { status: "in_transit", changedBy: "USR-002", changedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), comment: "Package picked up" },
      ],
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "SHP-2026-0002",
      module: "shipping",
      title: "FedEx international shipment",
      status: "delivered",
      requesterId: "USR-001",
      requesterName: "Marwan Elafifi",
      requesterEmail: "marwan.elafifi@si-ware.com",
      payload: {
        supplier: "FedEx",
        costCenter: "Sales",
        poNumber: "PO-2026-1002",
        carrier: "FedEx",
        trackingNumber: "794698320129",
        description: "Client samples to London office",
        expectedDeliveryDate: "2026-04-22",
      },
      statusHistory: [
        { status: "new", changedBy: "USR-001", changedAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(), comment: "Submitted" },
        { status: "in_transit", changedBy: "USR-001", changedAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(), comment: "In transit" },
        { status: "delivered", changedBy: "USR-001", changedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(), comment: "Delivered successfully" },
      ],
      createdAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "MNT-2026-0001",
      module: "maintenance",
      title: "Server room AC maintenance",
      status: "new",
      requesterId: "USR-001",
      requesterName: "Marwan Elafifi",
      requesterEmail: "marwan.elafifi@si-ware.com",
      payload: {
        description: "Annual AC system inspection and maintenance",
        priority: "High",
        estimatedCost: 5000,
      },
      statusHistory: [
        { status: "new", changedBy: "USR-001", changedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), comment: "Submitted" },
      ],
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "PRC-2026-0001",
      module: "purchase",
      title: "Office supplies procurement",
      status: "in_transit",
      requesterId: "USR-001",
      requesterName: "Marwan Elafifi",
      requesterEmail: "marwan.elafifi@si-ware.com",
      payload: {
        description: "Monthly office supplies for Cairo office",
        quantity: 50,
        budget: 2500,
        supplier: "Office Max",
      },
      statusHistory: [
        { status: "new", changedBy: "USR-001", changedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(), comment: "Submitted" },
        { status: "in_transit", changedBy: "USR-001", changedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), comment: "Order placed with supplier" },
      ],
      createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "EVT-2026-0001",
      module: "event",
      title: "Q2 team building event venue",
      status: "on_hold",
      requesterId: "USR-001",
      requesterName: "Marwan Elafifi",
      requesterEmail: "marwan.elafifi@si-ware.com",
      payload: {
        description: "Team building activities for all departments",
        eventDate: "2026-05-15",
        expectedAttendees: 150,
        budget: 15000,
      },
      statusHistory: [
        { status: "new", changedBy: "USR-001", changedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), comment: "Submitted" },
        { status: "on_hold", changedBy: "USR-002", changedAt: now.toISOString(), comment: "Awaiting venue confirmation" },
      ],
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: "TRV-2026-0001",
      module: "travel",
      title: "Business trip to Dubai - Conference",
      status: "new",
      requesterId: "USR-001",
      requesterName: "Marwan Elafifi",
      requesterEmail: "marwan.elafifi@si-ware.com",
      payload: {
        destination: "Dubai, UAE",
        startDate: "2026-05-10",
        endDate: "2026-05-14",
        purpose: "Tech conference attendance",
        budget: 3500,
      },
      statusHistory: [
        { status: "new", changedBy: "USR-001", changedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), comment: "Travel request submitted" },
      ],
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "SHP-2026-0003",
      module: "shipping",
      title: "Aramex shipment to Riyadh",
      status: "on_hold",
      requesterId: "USR-001",
      requesterName: "Marwan Elafifi",
      requesterEmail: "marwan.elafifi@si-ware.com",
      payload: {
        supplier: "Aramex",
        costCenter: "Operations",
        poNumber: "PO-2026-1003",
        carrier: "Aramex",
        description: "Parts shipment for Saudi facility",
        expectedDeliveryDate: "2026-05-05",
      },
      statusHistory: [
        { status: "new", changedBy: "USR-001", changedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(), comment: "Submitted" },
        { status: "on_hold", changedBy: "USR-002", changedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(), comment: "Awaiting PO confirmation" },
      ],
      createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "MNT-2026-0002",
      module: "maintenance",
      title: "Network infrastructure upgrade",
      status: "completed",
      requesterId: "USR-001",
      requesterName: "Marwan Elafifi",
      requesterEmail: "marwan.elafifi@si-ware.com",
      payload: {
        description: "Upgrade network switches and cabling",
        priority: "Medium",
        estimatedCost: 12000,
      },
      statusHistory: [
        { status: "new", changedBy: "USR-001", changedAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(), comment: "Submitted" },
        { status: "in_transit", changedBy: "USR-001", changedAt: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000).toISOString(), comment: "Work in progress" },
        { status: "completed", changedBy: "USR-001", changedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(), comment: "Upgrade completed successfully" },
      ],
      createdAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ]

  const hrRequests: EngineRequest[] = [
    {
      id: "HR-2026-0001",
      module: "hr",
      title: "Onboarding – Ahmed Kamal",
      status: "new",
      requesterId: "USR-001",
      requesterName: "Marwan Elafifi",
      requesterEmail: "marwan.elafifi@si-ware.com",
      payload: {
        hrType: "onboarding",
        employeeName: "Ahmed Kamal",
        employeeId: "EMP-2026-041",
        department: "Engineering",
        startDate: "2026-05-05",
        items: ["Medical Insurance for New Hire", "Access Card", "Seating Assignment"],
        notes: "New hire joining the embedded systems team.",
      },
      statusHistory: [
        { status: "new", changedBy: "USR-001", changedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), comment: "Submitted" },
      ],
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "HR-2026-0002",
      module: "hr",
      title: "Onboarding – Sara Mostafa",
      status: "on_hold",
      requesterId: "USR-001",
      requesterName: "Marwan Elafifi",
      requesterEmail: "marwan.elafifi@si-ware.com",
      payload: {
        hrType: "onboarding",
        employeeName: "Sara Mostafa",
        employeeId: "EMP-2026-042",
        department: "Sales",
        startDate: "2026-05-12",
        items: ["Medical Insurance for New Hire", "Access Card"],
        notes: "Awaiting medical insurance provider confirmation.",
      },
      statusHistory: [
        { status: "new", changedBy: "USR-001", changedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(), comment: "Submitted" },
        { status: "on_hold", changedBy: "USR-002", changedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), comment: "Awaiting medical provider approval" },
      ],
      createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "HR-2026-0003",
      module: "hr",
      title: "Onboarding – Karim Adel",
      status: "completed",
      requesterId: "USR-001",
      requesterName: "Marwan Elafifi",
      requesterEmail: "marwan.elafifi@si-ware.com",
      payload: {
        hrType: "onboarding",
        employeeName: "Karim Adel",
        employeeId: "EMP-2026-039",
        department: "Finance",
        startDate: "2026-04-15",
        items: ["Medical Insurance for New Hire", "Access Card", "Seating Assignment"],
      },
      statusHistory: [
        { status: "new", changedBy: "USR-001", changedAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(), comment: "Submitted" },
        { status: "completed", changedBy: "USR-002", changedAt: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000).toISOString(), comment: "All onboarding items completed" },
      ],
      createdAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "HR-2026-0004",
      module: "hr",
      title: "Offboarding – Nadia Hassan",
      status: "new",
      requesterId: "USR-001",
      requesterName: "Marwan Elafifi",
      requesterEmail: "marwan.elafifi@si-ware.com",
      payload: {
        hrType: "offboarding",
        employeeName: "Nadia Hassan",
        employeeId: "EMP-2024-018",
        department: "Marketing",
        lastWorkingDay: "2026-04-30",
        items: ["Close Medical for Leaver", "Collect Access Card"],
        notes: "Resignation accepted. Please process all offboarding items before last day.",
      },
      statusHistory: [
        { status: "new", changedBy: "USR-001", changedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(), comment: "Submitted" },
      ],
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "HR-2026-0005",
      module: "hr",
      title: "Offboarding – Tarek Samy",
      status: "on_hold",
      requesterId: "USR-001",
      requesterName: "Marwan Elafifi",
      requesterEmail: "marwan.elafifi@si-ware.com",
      payload: {
        hrType: "offboarding",
        employeeName: "Tarek Samy",
        employeeId: "EMP-2023-007",
        department: "Operations",
        lastWorkingDay: "2026-05-01",
        items: ["Collect Access Card"],
        notes: "Medical already closed by provider. Only access card collection pending.",
      },
      statusHistory: [
        { status: "new", changedBy: "USR-001", changedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(), comment: "Submitted" },
        { status: "on_hold", changedBy: "USR-002", changedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), comment: "Employee unavailable for card collection" },
      ],
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "HR-2026-0006",
      module: "hr",
      title: "Offboarding – Layla Fahmy",
      status: "completed",
      requesterId: "USR-001",
      requesterName: "Marwan Elafifi",
      requesterEmail: "marwan.elafifi@si-ware.com",
      payload: {
        hrType: "offboarding",
        employeeName: "Layla Fahmy",
        employeeId: "EMP-2022-031",
        department: "Engineering",
        lastWorkingDay: "2026-04-10",
        items: ["Close Medical for Leaver", "Collect Access Card"],
      },
      statusHistory: [
        { status: "new", changedBy: "USR-001", changedAt: new Date(now.getTime() - 22 * 24 * 60 * 60 * 1000).toISOString(), comment: "Submitted" },
        { status: "completed", changedBy: "USR-002", changedAt: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000).toISOString(), comment: "All offboarding items completed" },
      ],
      createdAt: new Date(now.getTime() - 22 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ]

  writeAll([...mockRequests, ...hrRequests])
  localStorage.setItem(MOCK_VERSION_KEY, MOCK_VERSION)
}
