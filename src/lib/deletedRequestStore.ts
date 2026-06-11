import fs from "fs"
import path from "path"
import type { EngineRequest } from "@/services/engineService"

/**
 * Server-side JSON store for soft-deleted requests (recycle bin).
 * Mirrors the pattern used by requestStore.ts / data/requests.json.
 * Loaded from disk on every read; every write also flushes to disk so
 * the bin survives container restarts.
 */

export interface DeletedRequest {
  request: EngineRequest
  deletedAt: string
  deletedBy: string // actor display name or email
}

const STORE_PATH = path.join(process.cwd(), "data", "deleted-requests.json")
const MAX_ENTRIES = 200

function ensureStore() {
  const dir = path.dirname(STORE_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(STORE_PATH)) fs.writeFileSync(STORE_PATH, JSON.stringify([]), "utf-8")
}

function readFromDisk(): DeletedRequest[] {
  try {
    ensureStore()
    const raw = fs.readFileSync(STORE_PATH, "utf-8")
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeToDisk(data: DeletedRequest[]) {
  ensureStore()
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf-8")
}

class DeletedRequestStore {
  getAll(): DeletedRequest[] {
    // Re-read on every call so multiple Next.js server instances stay consistent.
    return readFromDisk()
  }

  /** Prepend the deleted record; keep only the last MAX_ENTRIES entries. */
  save(req: EngineRequest, deletedBy: string): void {
    const store = readFromDisk()
    // Avoid duplicate entries for the same request id
    const without = store.filter((d) => d.request.id !== req.id)
    const entry: DeletedRequest = {
      request: req,
      deletedAt: new Date().toISOString(),
      deletedBy,
    }
    const next = [entry, ...without].slice(0, MAX_ENTRIES)
    writeToDisk(next)
  }

  /** Permanently purge one entry from the recycle bin. Returns true if found. */
  remove(id: string): boolean {
    const store = readFromDisk()
    const next = store.filter((d) => d.request.id !== id)
    if (next.length === store.length) return false
    writeToDisk(next)
    return true
  }

  /** Purge everything from the recycle bin. */
  clear(): void {
    writeToDisk([])
  }
}

export const deletedRequestStore = new DeletedRequestStore()
