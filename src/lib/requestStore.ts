import fs from "fs"
import path from "path"
import type { EngineRequest } from "@/services/engineService"

/**
 * Server-side JSON store for requests — the shared source of truth across
 * all users. Mirrors the pattern used by data/comments.json and
 * data/feedback.json. Loaded into memory at module-load time; every write
 * also flushes to disk so the data survives container restarts.
 */

const STORE_PATH = path.join(process.cwd(), "data", "requests.json")

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
    return [...this.store]
  }

  upsert(request: EngineRequest): EngineRequest {
    this.store = readFromDisk()
    const idx = this.store.findIndex((r) => r.id === request.id)
    if (idx >= 0) {
      this.store[idx] = request
    } else {
      this.store.push(request)
    }
    writeToDisk(this.store)
    return request
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
