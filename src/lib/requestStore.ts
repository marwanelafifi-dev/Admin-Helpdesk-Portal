import fs from "fs"
import path from "path"
import type { EngineRequest } from "@/services/engineService"
import { hasRecordedApproval } from "@/lib/approvalRules"
import { requestTombstoneStore } from "@/lib/requestTombstoneStore"

/**
 * Server-side JSON store for requests — the shared source of truth across
 * all users. Mirrors the pattern used by data/comments.json and
 * data/feedback.json. Loaded into memory at module-load time; every write
 * also flushes to disk so the data survives container restarts.
 */

const STORE_PATH = path.join(process.cwd(), "data", "requests.json")

const MODULE_ID_PREFIX: Record<string, string> = {
  maintenance: "ADM-MNT",
  purchase: "ADM-PRC",
  event: "ADM-EVT",
  travel: "ADM-TRV",
  general: "ADM-GEN",
  hr_general: "HR-GEN",
  hr_letter: "HR-LTR",
  hr_travel_letter: "HR-LTR",
  finance_reimbursement: "FIN-GRF",
  finance_travel_reimbursement: "FIN-TRF",
  finance_invoice_payment: "FIN-INV",
}

/**
 * A request ID identifies its owning function, precise request type, and the
 * month it was submitted. The numeric sequence is therefore independent for
 * each function/module/month scope, while always remaining four digits.
 */
function requestIdPrefix(request: EngineRequest): string {
  if (request.module === "shipping") {
    return (request.payload as { direction?: string })?.direction === "sending"
      ? "ADM-SHP-EXP"
      : "ADM-SHP-IMP"
  }

  if (request.module === "hr") {
    return (request.payload as { hrType?: string })?.hrType === "offboarding"
      ? "HR-OFF"
      : "HR-ONB"
  }

  return MODULE_ID_PREFIX[request.module] ?? "SYS-REQ"
}

function ensureStore() {
  const dir = path.dirname(STORE_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(STORE_PATH)) fs.writeFileSync(STORE_PATH, JSON.stringify([]), "utf-8")
}

function readFromDisk(): EngineRequest[] {
  try {
    ensureStore()
    const raw = fs.readFileSync(STORE_PATH, "utf-8")
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeToDisk(data: EngineRequest[]) {
  ensureStore()
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf-8")
}

class RequestStore {
  private store: EngineRequest[] = []

  constructor() {
    this.store = readFromDisk()
  }

  getAll(): EngineRequest[] {
    // Re-read on every call so multiple Next.js server instances stay
    // consistent without needing pub/sub. JSON file IO is cheap at this scale.
    this.store = readFromDisk()
    // Repair legacy/test records that were manually put back into Awaiting
    // Approval after the manager had already approved them.
    let repaired = false
    const now = new Date().toISOString()
    this.store = this.store.map((request) => {
      if (request.status !== "awaiting_approval" || !hasRecordedApproval(request)) return request
      repaired = true
      return {
        ...request,
        status: "in_progress",
        updatedAt: now,
        statusHistory: [
          ...(request.statusHistory ?? []),
          { status: "in_progress", changedBy: "System", changedAt: now, comment: "Restored to In Progress after recorded manager approval" },
        ],
      } as EngineRequest
    })
    if (repaired) writeToDisk(this.store)
    return [...this.store]
  }

  get(id: string): EngineRequest | undefined {
    return this.getAll().find((r) => r.id === id)
  }

  upsert(request: EngineRequest): EngineRequest {
    this.store = readFromDisk()
    const idx = this.store.findIndex((r) => r.id === request.id)
    if (idx >= 0) {
      if (this.store[idx].updatedAt > request.updatedAt) {
        return this.store[idx]
      }
      this.store[idx] = request
    } else {
      this.store.push(request)
    }
    writeToDisk(this.store)
    return request
  }

  /**
   * Re-read and transition only if the request is still in an expected
   * status. This makes approval/rejection first-decision-wins even when two
   * email links are opened at nearly the same time.
   */
  transitionIfStatus(
    id: string,
    expectedStatuses: readonly string[],
    transform: (current: EngineRequest) => EngineRequest,
  ): EngineRequest | null {
    this.store = readFromDisk()
    const idx = this.store.findIndex((request) => request.id === id)
    if (idx < 0 || !expectedStatuses.includes(this.store[idx].status)) return null
    const updated = transform(this.store[idx])
    this.store[idx] = updated
    writeToDisk(this.store)
    return updated
  }

  create(request: EngineRequest): EngineRequest {
    this.store = readFromDisk()

    if (request.clientRequestId) {
      const existing = this.store.find(
        (item) => item.clientRequestId === request.clientRequestId
      )
      if (existing) return existing
    }

    const createdAt = new Date()
    const year = createdAt.getFullYear()
    const month = String(createdAt.getMonth() + 1).padStart(2, "0")
    const prefix = requestIdPrefix(request)
    const pattern = new RegExp(`^${prefix}-${year}-${month}-(\\d{4})$`)
    const currentMax = [...this.store.map((item) => item.id), ...requestTombstoneStore.ids()].reduce((max, id) => {
      const match = id.match(pattern)
      if (!match) return max
      const value = Number(match[1])
      return Number.isFinite(value) ? Math.max(max, value) : max
    }, 0)
    const nextSequence = currentMax + 1
    if (nextSequence > 9999) {
      throw new Error(`Request ID sequence exhausted for ${prefix}-${year}-${month}`)
    }
    const id = `${prefix}-${year}-${month}-${String(nextSequence).padStart(4, "0")}`
    const now = new Date().toISOString()
    const saved = { ...request, id, updatedAt: now }

    this.store.push(saved)
    writeToDisk(this.store)
    return saved
  }

  importMany(requests: EngineRequest[]): EngineRequest[] {
    this.store = readFromDisk()
    const existingIds = new Set(this.store.map((request) => request.id))
    const incomingIds = new Set<string>()

    for (const request of requests) {
      if (existingIds.has(request.id) || incomingIds.has(request.id)) {
        throw new Error(`Request ID ${request.id} already exists`)
      }
      incomingIds.add(request.id)
    }

    this.store.push(...requests)
    writeToDisk(this.store)
    return requests
  }

  bulkReplace(requests: EngineRequest[]): void {
    this.store = requests
    writeToDisk(this.store)
  }

  remove(id: string): boolean {
    this.store = readFromDisk()
    const next = this.store.filter((r) => r.id !== id)
    if (next.length === this.store.length) return false
    this.store = next
    writeToDisk(this.store)
    return true
  }

  clear(): void {
    this.store = []
    writeToDisk(this.store)
  }
}

export const requestStore = new RequestStore()
