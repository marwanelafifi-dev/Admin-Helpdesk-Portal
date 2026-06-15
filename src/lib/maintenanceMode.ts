import fs from "fs"
import path from "path"

/**
 * Maintenance mode + force-signout state, persisted server-side so it
 * survives restarts and applies across every running app instance.
 *
 * Layout (data/maintenance.json):
 * {
 *   "maintenance": false,
 *   "maintenanceMessage": "We're doing maintenance — back soon.",
 *   "sessionMinVersion": 0
 * }
 *
 * - `maintenance`: when true, middleware blocks every non-admin route
 *   and returns the maintenance page. Admins (Full Access) still get
 *   through so they can flip it back off.
 * - `sessionMinVersion`: a Unix epoch (seconds). Any session token whose
 *   `iat` is older than this value is treated as invalid by auth.ts and
 *   forces a fresh sign-in. Bump this to log everyone out.
 */

export interface MaintenanceState {
  maintenance: boolean
  maintenanceMessage: string
  sessionMinVersion: number
}

const DEFAULTS: MaintenanceState = {
  maintenance: false,
  maintenanceMessage: "We're doing maintenance — we'll be right back.",
  sessionMinVersion: 0,
}

const STORE_PATH = path.join(process.cwd(), "data", "maintenance.json")

function ensureStore() {
  const dir = path.dirname(STORE_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify(DEFAULTS, null, 2), "utf-8")
  }
}

export function readMaintenanceState(): MaintenanceState {
  try {
    ensureStore()
    const raw = fs.readFileSync(STORE_PATH, "utf-8")
    const parsed = JSON.parse(raw) as Partial<MaintenanceState>
    return {
      maintenance: typeof parsed.maintenance === "boolean" ? parsed.maintenance : DEFAULTS.maintenance,
      maintenanceMessage: typeof parsed.maintenanceMessage === "string" ? parsed.maintenanceMessage : DEFAULTS.maintenanceMessage,
      sessionMinVersion: typeof parsed.sessionMinVersion === "number" ? parsed.sessionMinVersion : DEFAULTS.sessionMinVersion,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

export function writeMaintenanceState(next: Partial<MaintenanceState>): MaintenanceState {
  const current = readMaintenanceState()
  const merged: MaintenanceState = {
    maintenance: typeof next.maintenance === "boolean" ? next.maintenance : current.maintenance,
    maintenanceMessage: typeof next.maintenanceMessage === "string" ? next.maintenanceMessage : current.maintenanceMessage,
    sessionMinVersion: typeof next.sessionMinVersion === "number" ? next.sessionMinVersion : current.sessionMinVersion,
  }
  ensureStore()
  fs.writeFileSync(STORE_PATH, JSON.stringify(merged, null, 2), "utf-8")
  return merged
}

/** Bump the session min-version to now → every existing JWT becomes stale. */
export function bumpSessionMinVersion(): MaintenanceState {
  return writeMaintenanceState({ sessionMinVersion: Math.floor(Date.now() / 1000) })
}
