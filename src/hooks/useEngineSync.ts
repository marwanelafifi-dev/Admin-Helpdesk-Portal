"use client"

import { useEffect } from "react"
import { syncFromServer, getRequests } from "@/services/engineService"
import { syncCompanyDataFromServer } from "@/lib/companyDataStore"

const MIGRATION_KEY = "arp_requests_server_migration_v1"
const CD_MIGRATION_KEY = "arp_company_data_server_migration_v1"
const CD_STORAGE_KEY = "arp_company_data"

/**
 * One-shot migration: the first time a user opens the app after the
 * server store was introduced, push any local-only requests they had
 * accumulated in localStorage up to the server. This ensures historical
 * single-user data becomes visible to everyone instead of getting
 * overwritten on the next pull.
 */
async function backfillLocalToServer() {
  if (typeof window === "undefined") return
  if (localStorage.getItem(MIGRATION_KEY)) return

  const local = getRequests()
  if (local.length === 0) {
    localStorage.setItem(MIGRATION_KEY, "1")
    return
  }

  try {
    // Sequentially POST each local request so the server picks them up.
    // It's fine if some are duplicates — upsert is idempotent.
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

/**
 * Company Data backfill — pushes the local lookup tables up to the server
 * the first time the user opens the app after the server store landed.
 * Without this, syncCompanyDataFromServer would wipe a user's local
 * tables on first sync because the server starts empty.
 *
 * Best-effort: if the user lacks write permission (no `settings`,
 * `page:admin-company-data`, etc.) the PUT returns 403 and we still mark
 * the migration done so we don't retry forever.
 */
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
    // Only push if there's actually something local to share.
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

/**
 * Keep localStorage's `arp_requests` cache in step with the server.
 * - Pulls once on mount (so a fresh page load shows other users' submissions).
 * - Pulls every 30 seconds while the tab is alive.
 * - Pulls on focus / visibility change so returning to the tab refreshes.
 *
 * Mounted by the dashboard Shell so every page in (dashboard)/* benefits
 * without per-page wiring.
 */
export function useEngineSync(intervalMs = 30_000) {
  useEffect(() => {
    let cancelled = false

    const pull = () => {
      if (cancelled) return
      void syncFromServer()
      // Company Data (suppliers, cost centers, managers, departments,
      // sectors, carriers) is also shared across all users via a server
      // store. Pull it on the same cadence so dropdowns stay in sync.
      void syncCompanyDataFromServer()
    }

    // First, push local-only history up to the server (one-time).
    // Then start regular pulls so the local cache picks up the merged state.
    void Promise.all([
      backfillLocalToServer(),
      backfillCompanyDataToServer(),
    ]).then(() => {
      if (cancelled) return
      pull()
    })
    const interval = window.setInterval(pull, intervalMs)
    const onVisible = () => {
      if (document.visibilityState === "visible") pull()
    }
    // Global Clear All broadcasts via this localStorage key; the native
    // `storage` event fires only in OTHER tabs, so this is exactly how we
    // tell every other open tab to forget its cache and resync.
    const onStorage = (e: StorageEvent) => {
      if (e.key === "arp_global_clear_broadcast") {
        try {
          localStorage.removeItem("arp_requests")
          localStorage.removeItem("arp_company_data")
        } catch {}
        pull()
      }
    }
    window.addEventListener("focus", pull)
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("storage", onStorage)

    return () => {
      cancelled = true
      window.clearInterval(interval)
      window.removeEventListener("focus", pull)
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("storage", onStorage)
    }
  }, [intervalMs])
}
