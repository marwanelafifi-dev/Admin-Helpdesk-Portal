import fs from "fs"
import path from "path"

export interface SessionRecord {
  userId: string
  email: string
  name: string
  lastSeen: string // ISO
}

const STORE_PATH = path.join(process.cwd(), "data", "sessions.json")
const ONLINE_THRESHOLD_MS = 2 * 60 * 1000 // 2 minutes

function ensureStore() {
  const dir = path.dirname(STORE_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(STORE_PATH)) fs.writeFileSync(STORE_PATH, JSON.stringify([]), "utf-8")
}

function readFromDisk(): SessionRecord[] {
  try {
    ensureStore()
    const raw = fs.readFileSync(STORE_PATH, "utf-8")
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeToDisk(data: SessionRecord[]) {
  ensureStore()
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf-8")
}

class SessionStore {
  upsert(userId: string, email: string, name: string): void {
    const all = readFromDisk()
    const idx = all.findIndex((s) => s.userId === userId)
    const record: SessionRecord = { userId, email, name, lastSeen: new Date().toISOString() }
    if (idx >= 0) all[idx] = record
    else all.push(record)
    // Keep only last 7 days of records to avoid unbounded growth
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
    const pruned = all.filter((s) => new Date(s.lastSeen).getTime() > cutoff)
    writeToDisk(pruned)
  }

  getOnline(): SessionRecord[] {
    const cutoff = Date.now() - ONLINE_THRESHOLD_MS
    return readFromDisk().filter((s) => new Date(s.lastSeen).getTime() > cutoff)
  }

  getAll(): SessionRecord[] {
    return readFromDisk()
  }
}

export const sessionStore = new SessionStore()
export const ONLINE_THRESHOLD_MS_EXPORT = ONLINE_THRESHOLD_MS
