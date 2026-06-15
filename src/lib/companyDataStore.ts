export type CompanyDataKey =
  | "suppliers"
  | "cost_centers"
  | "managers"
  | "carriers"
  | "departments"
  | "sectors"

export interface Manager {
  name: string
  email: string
}

// Internal shape persisted to localStorage. `managers` is the only key that
// can hold either legacy `string[]` (just names) or the new `Manager[]`
// (`{name, email}` pairs). Everything else stays `string[]`.
interface StoredCompanyData {
  suppliers: string[]
  cost_centers: string[]
  managers: Array<string | Manager>
  carriers: string[]
  departments: string[]
  sectors: string[]
}

const STORAGE_KEY = "arp_company_data"

const DEFAULTS: StoredCompanyData = {
  suppliers: [],
  cost_centers: [],
  managers: [],
  carriers: [],
  departments: [],
  sectors: [],
}

function readRaw(): StoredCompanyData {
  if (typeof window === "undefined") return { ...DEFAULTS }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw) as Partial<StoredCompanyData>
    return {
      suppliers:    Array.isArray(parsed.suppliers)    ? parsed.suppliers    : DEFAULTS.suppliers,
      cost_centers: Array.isArray(parsed.cost_centers) ? parsed.cost_centers : DEFAULTS.cost_centers,
      managers:     Array.isArray(parsed.managers)     ? parsed.managers     : DEFAULTS.managers,
      carriers:     Array.isArray(parsed.carriers)     ? parsed.carriers     : DEFAULTS.carriers,
      departments:  Array.isArray(parsed.departments)  ? parsed.departments  : DEFAULTS.departments,
      sectors:      Array.isArray(parsed.sectors)      ? parsed.sectors      : DEFAULTS.sectors,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

function writeRaw(data: StoredCompanyData): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  // Push to the shared server store so every user sees the same data.
  pushToServer(data)
}

/** Fire-and-forget upload of the current state to the server. */
function pushToServer(data: StoredCompanyData): void {
  if (typeof window === "undefined") return
  fetch("/api/company-data", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).catch(() => {
    // Best effort. The next sync will reconcile.
  })
}

/**
 * Pull the latest company data from the server and overwrite the local
 * cache. Called on app load (via useCompanyDataSync below) so users
 * always see the team-wide lookups rather than their own empty browser.
 */
export async function syncCompanyDataFromServer(): Promise<void> {
  if (typeof window === "undefined") return
  try {
    const res = await fetch("/api/company-data", { cache: "no-store" })
    if (!res.ok) return
    const json = await res.json()
    const remote = json?.data as Partial<StoredCompanyData> | undefined
    if (!remote) return
    const next: StoredCompanyData = {
      suppliers:    Array.isArray(remote.suppliers)    ? remote.suppliers    : [],
      cost_centers: Array.isArray(remote.cost_centers) ? remote.cost_centers : [],
      managers:     Array.isArray(remote.managers)     ? remote.managers     : [],
      carriers:     Array.isArray(remote.carriers)     ? remote.carriers     : [],
      departments:  Array.isArray(remote.departments)  ? remote.departments  : [],
      sectors:      Array.isArray(remote.sectors)      ? remote.sectors      : [],
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Offline / 401 — leave cache untouched.
  }
}

// Public read shape: managers exposed as string[] (names only) for legacy
// callers that don't care about emails. Use `getManagers()` for the full pair.
export type CompanyData = Record<CompanyDataKey, string[]>

function managerName(m: string | Manager): string {
  return typeof m === "string" ? m : m.name
}

export function getCompanyData(): CompanyData {
  const raw = readRaw()
  return {
    suppliers: raw.suppliers,
    cost_centers: raw.cost_centers,
    managers: raw.managers.map(managerName),
    carriers: raw.carriers,
    departments: raw.departments,
    sectors: raw.sectors,
  }
}

export function saveCompanyData(data: CompanyData): void {
  // Preserve existing manager emails when callers save the names-only view.
  const existing = readRaw()
  const existingMap = new Map<string, Manager>()
  for (const m of existing.managers) {
    if (typeof m === "string") existingMap.set(m.toLowerCase(), { name: m, email: "" })
    else existingMap.set(m.name.toLowerCase(), m)
  }
  const merged: Array<string | Manager> = data.managers.map((name) => {
    const prior = existingMap.get(name.toLowerCase())
    return prior ?? { name, email: "" }
  })
  writeRaw({
    suppliers: data.suppliers,
    cost_centers: data.cost_centers,
    managers: merged,
    carriers: data.carriers,
    departments: data.departments,
    sectors: data.sectors,
  })
}

export function getList(key: CompanyDataKey): string[] {
  return getCompanyData()[key]
}

export function saveList(key: CompanyDataKey, items: string[]): void {
  const data = getCompanyData()
  data[key] = items
  saveCompanyData(data)
}

export function addItem(key: CompanyDataKey, value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  const list = getList(key)
  const exists = list.some((item) => item.toLowerCase() === trimmed.toLowerCase())
  if (exists) return false
  saveList(key, [...list, trimmed])
  return true
}

// ── Managers (with email) ────────────────────────────────────────────────────

export function getManagers(): Manager[] {
  return readRaw().managers.map((m) =>
    typeof m === "string" ? { name: m, email: "" } : { name: m.name, email: m.email ?? "" }
  )
}

export function saveManagers(managers: Manager[]): void {
  const raw = readRaw()
  raw.managers = managers.map((m) => ({ name: m.name.trim(), email: m.email.trim() }))
  writeRaw(raw)
}

export function getManagerEmail(name: string): string | undefined {
  const trimmed = name.trim().toLowerCase()
  if (!trimmed) return undefined
  for (const m of getManagers()) {
    if (m.name.toLowerCase() === trimmed) return m.email || undefined
  }
  // Fallback: the legacy data sometimes stored the email AS the name
  if (trimmed.includes("@")) return name.trim()
  return undefined
}

/** Add or update a manager. Returns true if the list changed. */
export function upsertManager(name: string, email: string): boolean {
  const cleanName = name.trim()
  const cleanEmail = email.trim()
  if (!cleanName) return false
  const list = getManagers()
  const idx = list.findIndex((m) => m.name.toLowerCase() === cleanName.toLowerCase())
  if (idx >= 0) {
    if (list[idx].email === cleanEmail) return false
    list[idx] = { name: cleanName, email: cleanEmail }
  } else {
    list.push({ name: cleanName, email: cleanEmail })
  }
  saveManagers(list)
  return true
}
