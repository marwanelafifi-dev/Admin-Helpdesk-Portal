"use client"

import { useEffect } from "react"
import { syncFromServer, getRequests } from "@/services/engineService"
import { syncCompanyDataFromServer } from "@/lib/companyDataStore"

const MIGRATION_KEY = "arp_requests_server_migration_v1"
const CD_MIGRATION_KEY = "arp_company_data_server_migration_v1"
const CD_STORAGE_KEY = "arp_company_data"

async function backfillLocalToServer() {
  if (typeof window === "undefined") return
  if (localStorage.getItem(MIGRATION_KEY)) return

  const local = getRequests()
  if (local.length === 0) {
    localStorage.setItem(MIGRATION_KEY, "1")
    return
  }

  try {
    for (const req of local) {
      await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request: req }),
      })
    }
    localStorage.setItem(MIGRATION_KEY, "1")
  } catch {
    // Try again next visit.
  }
}

async function backfillCompanyDataToServer() {
  if (typeof window === "undefined") return
  if (localStorage.getItem(CD_MIGRATION_KEY)) return

  const raw = localStorage.getItem(CD_STORAGE_KEY)
  if (!raw) {
    localStorage.setItem(CD_MIGRATION_KEY, "1")
    return
  }
  try {
    const local = JSON.parse(raw)
    const total = ["suppliers","cost_centers","managers","carriers","departments","sectors"]
      .reduce((sum, k) => sum + (Array.isArray(local?.[k]) ? local[k].length : 0), 0)
    if (total > 0) {
      await fetch("/api/company-data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(local),
      })
    }
    localStorage.setItem(CD_MIGRATION_KEY, "1")
  } catch {
    localStorage.setItem(CD_MIGRATION_KEY, "1")
  }
}

// Module-level state so dedup works across re-renders and hook instances.
let pullInFlight = false
let lastPullAt = 0
const MIN_PULL_GAP_MS = 20_000 // don't re-pull if a sync ran within 20 s

async function pull() {
  const now = Date.now()
  if (pullInFlight) return
  if (now - lastPullAt < MIN_PULL_GAP_MS) return
  pullInFlight = true
  lastPullAt = now
  try {
    await Promise.all([syncFromServer(), syncCompanyDataFromServer()])
  } finally {
    pullInFlight = false
  }
}

/**
 * Keep localStorage's `arp_requests` cache in step with the server.
 * - Pulls once on mount.
 * - Pulls every 60 seconds (was 30s).
 * - Pulls on focus / visibility — but only if last pull was >20 s ago so
 *   rapid tab-switching doesn't hammer the server.
 * - Deduplicates: only one in-flight pull at a time.
 */
export function useEngineSync(intervalMs = 60_000) {
  useEffect(() => {
    let cancelled = false

    const guardedPull = () => { if (!cancelled) void pull() }

    void Promise.all([
      backfillLocalToServer(),
      backfillCompanyDataToServer(),
    ]).then(() => { if (!cancelled) void pull() })

    const interval = window.setInterval(guardedPull, intervalMs)

    const onVisible = () => {
      if (document.visibilityState === "visible") guardedPull()
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key === "arp_global_clear_broadcast") {
        try {
          localStorage.removeItem("arp_requests")
          localStorage.removeItem("arp_company_data")
        } catch {}
        lastPullAt = 0 // force immediate re-pull after a clear
        guardedPull()
      }
    }

    window.addEventListener("focus", guardedPull)
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("storage", onStorage)

    return () => {
      cancelled = true
      window.clearInterval(interval)
      window.removeEventListener("focus", guardedPull)
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("storage", onStorage)
    }
  }, [intervalMs])
}
