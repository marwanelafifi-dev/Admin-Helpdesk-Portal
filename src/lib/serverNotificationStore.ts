import fs from "fs"
import path from "path"

export interface ServerNotification {
  id: string
  userId: string
  type: string
  title: string
  description: string
  requestId?: string
  actionUrl?: string
  createdAt: string
  read: boolean
}

const STORE_PATH = path.join(process.cwd(), "data", "notifications.json")
const MAX_NOTIFICATIONS = 2000

function ensureStore() {
  const dir = path.dirname(STORE_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(STORE_PATH)) fs.writeFileSync(STORE_PATH, JSON.stringify([]), "utf-8")
}

function readFromDisk(): ServerNotification[] {
  try {
    ensureStore()
    const raw = fs.readFileSync(STORE_PATH, "utf-8")
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeToDisk(data: ServerNotification[]) {
  ensureStore()
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf-8")
}

class ServerNotificationStore {
  add(notification: ServerNotification): void {
    const all = readFromDisk()
    if (all.some((n) => n.id === notification.id)) return
    const updated = [notification, ...all].slice(0, MAX_NOTIFICATIONS)
    writeToDisk(updated)
  }

  addMany(notifications: ServerNotification[]): void {
    const all = readFromDisk()
    const existingIds = new Set(all.map((n) => n.id))
    const fresh = notifications.filter((n) => !existingIds.has(n.id))
    if (fresh.length === 0) return
    const updated = [...fresh, ...all].slice(0, MAX_NOTIFICATIONS)
    writeToDisk(updated)
  }

  getForUser(userId: string, since?: string): ServerNotification[] {
    const all = readFromDisk()
    const filtered = all.filter((n) => n.userId === userId)
    if (since) {
      return filtered.filter((n) => n.createdAt > since)
    }
    return filtered
  }

  markRead(notificationId: string, userId: string): void {
    const all = readFromDisk()
    const updated = all.map((n) =>
      n.id === notificationId && n.userId === userId ? { ...n, read: true } : n
    )
    writeToDisk(updated)
  }

  markAllRead(userId: string): void {
    const all = readFromDisk()
    const updated = all.map((n) =>
      n.userId === userId ? { ...n, read: true } : n
    )
    writeToDisk(updated)
  }

  clear(userId?: string): void {
    if (userId) {
      writeToDisk(readFromDisk().filter((n) => n.userId !== userId))
    } else {
      writeToDisk([])
    }
  }
}

export const serverNotificationStore = new ServerNotificationStore()
