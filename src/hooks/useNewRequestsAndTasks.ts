import { useState, useEffect } from "react"

/**
 * Reads from arp_requests (the engineService localStorage key) and admin_tasks
 * (taskService key) and exposes:
 *  - newRequestsCount: total requests with status === "new"
 *  - newTasksCount: total tasks with status === "todo"
 *  - newRequestsByModule: per-module map of "new"-status counts, so sidebar
 *    items can show a per-page badge.
 *
 * Re-evaluates whenever localStorage changes (storage event), the window
 * regains focus, or every 30s as a fallback for same-tab writes.
 */

type Counts = Record<string, number>

const REQUESTS_KEY = "arp_requests"
const TASKS_KEY = "admin_tasks"

function read(key: string): any[] {
  try {
    const raw = typeof window === "undefined" ? null : localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function computeRequests(): { total: number; byModule: Counts } {
  const requests = read(REQUESTS_KEY)
  const byModule: Counts = {}
  let total = 0
  for (const r of requests) {
    if (r?.status === "new") {
      total++
      const mod = String(r.module ?? "")
      if (!mod) continue
      byModule[mod] = (byModule[mod] ?? 0) + 1
      // Sub-bucket for shipping so the sidebar can show separate counts on
      // Receiving and Sending instead of counting both against the parent.
      if (mod === "shipping") {
        const direction = String(r?.payload?.direction ?? "receiving")
        const key = direction === "sending" ? "shipping-sending" : "shipping-receiving"
        byModule[key] = (byModule[key] ?? 0) + 1
      }
    }
  }
  return { total, byModule }
}

function computeTasks(): number {
  const tasks = read(TASKS_KEY)
  return tasks.filter((t) => t?.status === "todo").length
}

export function useNewRequestsAndTasks() {
  const [newRequestsCount, setNewRequestsCount] = useState(0)
  const [newTasksCount, setNewTasksCount] = useState(0)
  const [newRequestsByModule, setNewRequestsByModule] = useState<Counts>({})

  useEffect(() => {
    if (typeof window === "undefined") return

    const recompute = () => {
      const { total, byModule } = computeRequests()
      setNewRequestsCount(total)
      setNewRequestsByModule(byModule)
      setNewTasksCount(computeTasks())
    }

    recompute()

    // `storage` only fires in OTHER tabs. `arp:storage` is the custom same-tab
    // event dispatched by engineService / taskService whenever they persist a
    // change, so badges update in real time without a page reload.
    window.addEventListener("storage", recompute)
    window.addEventListener("arp:storage", recompute)
    window.addEventListener("focus", recompute)
    const intervalId = window.setInterval(recompute, 30_000)

    return () => {
      window.removeEventListener("storage", recompute)
      window.removeEventListener("arp:storage", recompute)
      window.removeEventListener("focus", recompute)
      window.clearInterval(intervalId)
    }
  }, [])

  return {
    newRequestsCount,
    newTasksCount,
    newRequestsByModule,
    hasNewRequests: newRequestsCount > 0,
    hasNewTasks: newTasksCount > 0,
  }
}
