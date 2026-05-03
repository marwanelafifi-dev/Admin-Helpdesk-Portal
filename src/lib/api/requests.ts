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

function mapApiRequestRow(row: Record<string, unknown>): EngineRequest {
  const requester = row.requester as { name?: string; email?: string } | undefined
  const createdAt = row.createdAt
  const updatedAt = row.updatedAt
  const toIso = (v: unknown) =>
    typeof v === "string" ? v : v instanceof Date ? v.toISOString() : new Date(String(v)).toISOString()

  return {
    id: String(row.id),
    module: String(row.module),
    title: String(row.title),
    status: row.status as EngineRequest["status"],
    requesterId: String(row.requesterId),
    requesterName: requester?.name ?? "",
    requesterEmail: requester?.email ?? "",
    payload: (row.payload as Record<string, unknown>) ?? {},
    statusHistory: [],
    createdAt: toIso(createdAt),
    updatedAt: toIso(updatedAt),
  }
}

// API helpers
export async function fetchRequests(module: string, requesterId?: string): Promise<EngineRequest[]> {
  const qs = requesterId ? `?requesterId=${encodeURIComponent(requesterId)}` : ""
  const res = await fetch(`/api/requests/${module}${qs}`, { cache: "no-store", credentials: "include" })
  if (!res.ok) return []
  const json = await res.json()
  if (Array.isArray(json)) return json as EngineRequest[]
  const rows = json.requests as Record<string, unknown>[] | undefined
  if (Array.isArray(rows)) return rows.map(mapApiRequestRow)
  return (json.data as EngineRequest[]) ?? []
}

export async function fetchAllRequests(requesterId?: string): Promise<EngineRequest[]> {
  const modules = ["shipping", "maintenance", "purchase", "event", "travel", "hr"]
  const results = await Promise.all(modules.map((module) => fetchRequests(module, requesterId)))
  return results.flat()
}

export async function fetchRequestById(
  module: string,
  id: string
): Promise<{ ok: true; data: EngineRequest } | { ok: false; error: string }> {
  const res = await fetch(`/api/requests/${module}/${id}`, {
    cache: "no-store",
    credentials: "include",
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = typeof json.error === "string" ? json.error : `Request failed (${res.status})`
    return { ok: false, error: msg }
  }
  const payload = (json.ok && json.data ? json.data : json) as Record<string, unknown>
  return { ok: true, data: mapApiRequestRow(payload) }
}

export async function createRequest(
  module: string,
  payload: Record<string, unknown>,
  meta: { title: string; requesterId: string; requesterName: string; requesterEmail: string }
): Promise<{ ok: true; data: EngineRequest } | { ok: false; error: string }> {
  const res = await fetch(`/api/requests/${module}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      title: meta.title,
      payload,
      status: "new",
    }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = typeof json.error === "string" ? json.error : `Request failed (${res.status})`
    return { ok: false, error: msg }
  }
  return { ok: true, data: mapApiRequestRow(json as Record<string, unknown>) }
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
    credentials: "include",
    body: JSON.stringify({ status, changedBy }),
  })
  if (!res.ok) return null
  const json = await res.json()
  if (json.ok && json.data) return json.data as EngineRequest
  return (json.data ?? json) as EngineRequest | null
}

export async function deleteRequest(module: string, id: string): Promise<boolean> {
  const res = await fetch(`/api/requests/${module}/${id}`, {
    method: "DELETE",
    credentials: "include",
  })
  return res.ok
}
