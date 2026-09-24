import { useState, useEffect, useRef } from "react"
import { isModuleVisibleToFunction, type FunctionId } from "@/lib/functionRegistry"

/**
 * Reads from arp_requests / admin_tasks and exposes new-item counts for
 * sidebar badges.
 *
 * Performance optimisations applied:
 * - Interval increased from 30s → 60s (halves background CPU usage).
 * - `arp:storage` (same-tab writes) fires immediately — no debounce needed.
 * - `focus` and cross-tab `storage` events are debounced 500ms so rapid
 *   tab-switching doesn't stack up recomputes.
 * - The heavy JSON.parse + filter runs only when the localStorage value
 *   actually changed (compare raw string before parsing).
 */

type Counts = Record<string, number>

const REQUESTS_KEY = "arp_requests"
const TASKS_KEY: Record<FunctionId, string> = {
  admin: "admin_tasks",
  hr: "people_team_tasks",
  finance: "finance_team_tasks",
}

// Cached raw strings — skip recompute when nothing actually changed.
let _cachedRequestsRaw = ""
const _cachedResults: Partial<Record<FunctionId, { total: number; byModule: Counts }>> = {}
const _cachedTasksRaw: Partial<Record<FunctionId, string>> = {}
const _cachedTasksCount: Partial<Record<FunctionId, number>> = {}

function functionForActivePortal(): FunctionId {
  if (typeof window === "undefined") return "admin"
  const pathname = window.location.pathname
  if (pathname.startsWith("/departments/finance")) return "finance"
  if (pathname.startsWith("/departments/hr")) return "hr"
  return "admin"
}

function computeRequests(functionId: FunctionId): { total: number; byModule: Counts } {
  if (typeof window === "undefined") return { total: 0, byModule: {} }
  const raw = localStorage.getItem(REQUESTS_KEY) ?? ""
  if (raw === _cachedRequestsRaw && _cachedResults[functionId]) return _cachedResults[functionId]
  if (raw !== _cachedRequestsRaw) {
    _cachedRequestsRaw = raw
    for (const key of Object.keys(_cachedResults) as FunctionId[]) delete _cachedResults[key]
  }
  try {
    const requests: any[] = raw ? JSON.parse(raw) : []
    const byModule: Counts = {}
    let total = 0
    for (const r of requests) {
      if (r?.status !== "new" || !isModuleVisibleToFunction(String(r?.module ?? ""), functionId)) continue
      total++
      const mod = String(r.module ?? "")
      if (!mod) continue
      byModule[mod] = (byModule[mod] ?? 0) + 1
      if (mod === "shipping") {
        const dir = String(r?.payload?.direction ?? "receiving")
        const key = dir === "sending" ? "shipping-sending" : "shipping-receiving"
        byModule[key] = (byModule[key] ?? 0) + 1
      }
      if (mod === "hr") {
        const hrType = String(r?.payload?.hrType ?? "onboarding")
        const key = hrType === "offboarding" ? "hr-offboarding" : "hr-onboarding"
        byModule[key] = (byModule[key] ?? 0) + 1
      }
    }
    _cachedResults[functionId] = { total, byModule }
  } catch {
    _cachedResults[functionId] = { total: 0, byModule: {} }
  }
  return _cachedResults[functionId]!
}

function computeTasks(functionId: FunctionId): number {
  if (typeof window === "undefined") return 0
  const raw = localStorage.getItem(TASKS_KEY[functionId]) ?? ""
  if (raw === _cachedTasksRaw[functionId]) return _cachedTasksCount[functionId] ?? 0
  _cachedTasksRaw[functionId] = raw
  try {
    const tasks: any[] = raw ? JSON.parse(raw) : []
    _cachedTasksCount[functionId] = tasks.filter((t) => t?.status === "todo").length
  } catch {
    _cachedTasksCount[functionId] = 0
  }
  return _cachedTasksCount[functionId] ?? 0
}

export function useNewRequestsAndTasks() {
  const [newRequestsCount, setNewRequestsCount] = useState(0)
  const [newTasksCount, setNewTasksCount]       = useState(0)
  const [newRequestsByModule, setNewRequestsByModule] = useState<Counts>({})
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    const recompute = () => {
      const functionId = functionForActivePortal()
      const { total, byModule } = computeRequests(functionId)
      setNewRequestsCount(total)
      setNewRequestsByModule(byModule)
      setNewTasksCount(computeTasks(functionId))
    }

    // Debounced version for noisy events (focus, cross-tab storage)
    const recomputeDebounced = () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      debounceTimer.current = setTimeout(recompute, 500)
    }

    recompute()

    // Same-tab writes: fire immediately (dispatched by engineService/taskService)
    window.addEventListener("arp:storage", recompute)
    // Cross-tab storage and focus: debounced to avoid stacked recomputes
    window.addEventListener("storage", recomputeDebounced)
    window.addEventListener("focus", recomputeDebounced)
    const intervalId = window.setInterval(recompute, 60_000)

    return () => {
      window.removeEventListener("arp:storage", recompute)
      window.removeEventListener("storage", recomputeDebounced)
      window.removeEventListener("focus", recomputeDebounced)
      window.clearInterval(intervalId)
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [])

  return {
    newRequestsCount,
    newTasksCount,
    newRequestsByModule,
    hasNewRequests: newRequestsCount > 0,
    hasNewTasks:    newTasksCount > 0,
  }
}
