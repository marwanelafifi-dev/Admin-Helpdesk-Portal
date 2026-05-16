import { z } from "zod"

import type { EngineRequest, RequestStatus } from "@/lib/requests-api"

export type SubmitMeta = {
  title: string
  requesterId?: string
  requesterName?: string
  requesterEmail?: string
}
import { MODULE_PREFIX, REQUEST_MODULES, REQUEST_STATUSES } from "./constants"
import { readDb, writeDb } from "./db"

export type ListRequestsQuery = {
  module?: string
  requesterId?: string
  status?: string[]
  q?: string
}

export type UpdateRequestInput = {
  title?: string
  payload?: Record<string, unknown>
  status?: RequestStatus
  changedBy?: string
  comment?: string
}

const CreateBodySchema = z.object({
  payload: z.record(z.string(), z.unknown()).default({}),
  meta: z
    .object({
      title: z.string().min(1),
      requesterId: z.string().optional(),
      requesterName: z.string().optional(),
      requesterEmail: z.string().optional(),
    })
    .strict(),
})

function isKnownModule(module: string): module is (typeof REQUEST_MODULES)[number] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (REQUEST_MODULES as readonly any[]).includes(module)
}

function isKnownStatus(status: string): status is RequestStatus {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (REQUEST_STATUSES as readonly any[]).includes(status)
}

function generateId(module: string, requests: EngineRequest[]): string {
  const prefix = isKnownModule(module) ? MODULE_PREFIX[module] : "REQ"
  const year = new Date().getFullYear()
  const pattern = new RegExp(`^${prefix}-${year}-(\\d{4})$`)
  const currentMax = requests.reduce((max, req) => {
    const match = req.id.match(pattern)
    if (!match) return max
    const n = Number(match[1])
    return Number.isFinite(n) ? Math.max(max, n) : max
  }, 0)
  const next = String(currentMax + 1).padStart(4, "0")
  return `${prefix}-${year}-${next}`
}

export async function listRequests(query: ListRequestsQuery): Promise<EngineRequest[]> {
  const db = await readDb()

  let results = db.requests
  if (query.module) results = results.filter((r) => r.module === query.module)
  if (query.requesterId) results = results.filter((r) => r.requesterId === query.requesterId)
  if (query.status && query.status.length > 0) {
    const set = new Set(query.status)
    results = results.filter((r) => set.has(r.status))
  }
  if (query.q) {
    const needle = query.q.trim().toLowerCase()
    if (needle) {
      results = results.filter((r) => {
        const hay = `${r.id} ${r.title} ${r.requesterName} ${r.requesterEmail}`.toLowerCase()
        return hay.includes(needle)
      })
    }
  }

  return results.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export async function getRequest(module: string, id: string): Promise<EngineRequest | undefined> {
  const db = await readDb()
  return db.requests.find((r) => r.module === module && r.id === id)
}

export async function createRequest(module: string, body: unknown): Promise<EngineRequest> {
  const parsed = CreateBodySchema.parse(body)
  const db = await readDb()

  const id = generateId(module, db.requests)
  const now = new Date().toISOString()
  const meta: SubmitMeta = parsed.meta

  const request: EngineRequest = {
    id,
    module,
    title: meta.title,
    status: "new",
    requesterId: meta.requesterId ?? "USR-CURRENT",
    requesterName: meta.requesterName ?? "Current User",
    requesterEmail: meta.requesterEmail ?? "",
    payload: parsed.payload,
    statusHistory: [
      {
        status: "new",
        changedBy: meta.requesterId ?? "USR-CURRENT",
        changedAt: now,
        comment: "Submitted",
      },
    ],
    createdAt: now,
    updatedAt: now,
  }

  db.requests.push(request)
  await writeDb(db)
  return request
}

export async function updateRequest(module: string, id: string, patch: UpdateRequestInput): Promise<EngineRequest | null> {
  const db = await readDb()
  const index = db.requests.findIndex((r) => r.module === module && r.id === id)
  if (index === -1) return null

  const existing = db.requests[index]
  const now = new Date().toISOString()

  const nextStatus = patch.status ?? existing.status
  const shouldRecordStatusChange = patch.status && patch.status !== existing.status && isKnownStatus(patch.status)

  const updated: EngineRequest = {
    ...existing,
    title: patch.title ?? existing.title,
    payload: patch.payload ?? existing.payload,
    status: nextStatus,
    updatedAt: now,
    statusHistory: shouldRecordStatusChange
      ? [
          ...existing.statusHistory,
          {
            status: nextStatus,
            changedBy: patch.changedBy ?? "USR-CURRENT",
            changedAt: now,
            comment: patch.comment,
          },
        ]
      : existing.statusHistory,
  }

  db.requests[index] = updated
  await writeDb(db)
  return updated
}

export async function deleteRequest(module: string, id: string): Promise<boolean> {
  const db = await readDb()
  const before = db.requests.length
  db.requests = db.requests.filter((r) => !(r.module === module && r.id === id))
  if (db.requests.length === before) return false
  await writeDb(db)
  return true
}
