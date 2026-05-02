// Core types (previously in engineService)
export type RequestStatus =
  | "draft" | "new" | "on_hold" | "in_customs"
  | "in_transit" | "delivered" | "completed" | "cancelled"
  | "pending_assignment" | "assigned" | "awaiting_input" | "resolved" | "closed"

export interface StatusChange {
  status: RequestStatus
  changedBy: string
  changedAt: string
  comment?: string
}

export interface EngineRequest<T = Record<string, unknown>> {
  id: string
  module: string
  title: string
  status: RequestStatus
  requesterId: string
  requesterName: string
  requesterEmail: string
  payload: T
  statusHistory: StatusChange[]
  createdAt: string
  updatedAt: string
}

// API helpers
export async function fetchRequests(module: string, requesterId?: string): Promise<EngineRequest[]> {
  const qs = requesterId ? `?requesterId=${encodeURIComponent(requesterId)}` : ""
  const res = await fetch(`/api/requests/${module}${qs}`, { cache: "no-store" })
  if (!res.ok) return []
  const json = await res.json()
  // Route returns { ok, data } wrapper
  return Array.isArray(json) ? json : (json.data ?? [])
}

export async function fetchAllRequests(requesterId?: string): Promise<EngineRequest[]> {
  const modules = ["shipping", "maintenance", "purchase", "event", "travel", "hr"]
  const results = await Promise.all(modules.map((module) => fetchRequests(module, requesterId)))
  return results.flat()
}

export async function createRequest(
  module: string,
  payload: Record<string, unknown>,
  meta: { title: string; requesterId: string; requesterName: string; requesterEmail: string }
): Promise<EngineRequest | null> {
  const res = await fetch(`/api/requests/${module}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload, meta }),
  })
  if (!res.ok) return null
  const json = await res.json()
  return json.data ?? json
}

export async function updateRequestStatus(
  module: string,
  id: string,
  status: RequestStatus,
  changedBy: string
): Promise<EngineRequest | null> {
  const res = await fetch(`/api/requests/${module}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, changedBy }),
  })
  if (!res.ok) return null
  const json = await res.json()
  return json.data ?? json
}

export async function deleteRequest(module: string, id: string): Promise<boolean> {
  const res = await fetch(`/api/requests/${module}/${id}`, { method: "DELETE" })
  return res.ok
}
