// Core types (previously in engineService)
export type RequestStatus =
  | "draft" | "new" | "on_hold" | "in_customs"
  | "in_transit" | "delivered" | "completed" | "cancelled"

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
export async function fetchRequests(module: string): Promise<EngineRequest[]> {
  const res = await fetch(`/api/requests/${module}`, { cache: "no-store" })
  if (!res.ok) return []
  return res.json()
}

export async function fetchAllRequests(): Promise<EngineRequest[]> {
  const modules = ["shipping", "maintenance", "purchase", "event", "travel", "hr"]
  const results = await Promise.all(modules.map(fetchRequests))
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
  return res.json()
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
  return res.json()
}

export async function deleteRequest(module: string, id: string): Promise<boolean> {
  const res = await fetch(`/api/requests/${module}/${id}`, { method: "DELETE" })
  return res.ok
}
