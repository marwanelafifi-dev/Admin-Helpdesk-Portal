import { normalizeCompany, type CompanyId } from "@/lib/company"

export type CompanyDataKey =
  | "suppliers"
  | "cost_centers"
  | "managers"
  | "authorized_managers"
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
  authorized_managers: Array<string | Manager>
  carriers: string[]
  departments: string[]
  sectors: string[]
}

const STORAGE_KEY = "arp_company_data"
const ACTIVE_COMPANY_KEY = "arp_active_company"

function resolveCompany(company?: CompanyId): CompanyId {
  if (company) return normalizeCompany(company)
  if (typeof window === "undefined") return "siware"
  return normalizeCompany(localStorage.getItem(ACTIVE_COMPANY_KEY))
}

function storageKey(company: CompanyId): string {
  return company === "buchi" ? `${STORAGE_KEY}_buchi` : STORAGE_KEY
}

const DEFAULTS: StoredCompanyData = {
  suppliers: [],
  cost_centers: [],
  managers: [],
  authorized_managers: [],
  carriers: [],
  departments: [],
  sectors: [],
}

function readRaw(company?: CompanyId): StoredCompanyData {
  if (typeof window === "undefined") return { ...DEFAULTS }
  try {
    const raw = localStorage.getItem(storageKey(resolveCompany(company)))
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw) as Partial<StoredCompanyData>
    return {
      suppliers:           Array.isArray(parsed.suppliers)           ? parsed.suppliers           : DEFAULTS.suppliers,
      cost_centers:        Array.isArray(parsed.cost_centers)        ? parsed.cost_centers        : DEFAULTS.cost_centers,
      managers:            Array.isArray(parsed.managers)            ? parsed.managers            : DEFAULTS.managers,
      authorized_managers: Array.isArray(parsed.authorized_managers) ? parsed.authorized_managers : DEFAULTS.authorized_managers,
      carriers:            Array.isArray(parsed.carriers)            ? parsed.carriers            : DEFAULTS.carriers,
      departments:         Array.isArray(parsed.departments)         ? parsed.departments         : DEFAULTS.departments,
      sectors:             Array.isArray(parsed.sectors)             ? parsed.sectors             : DEFAULTS.sectors,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

function writeRaw(data: StoredCompanyData, company?: CompanyId): void {
  if (typeof window === "undefined") return
  company = resolveCompany(company)
  localStorage.setItem(storageKey(company), JSON.stringify(data))
  // Push to the shared server store so every user sees the same data.
  pushToServer(data, company)
}

/** Fire-and-forget upload of the current state to the server. */
function pushToServer(data: StoredCompanyData, company: CompanyId): void {
  if (typeof window === "undefined") return
  fetch(`/api/company-data?company=${company}`, {
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
export async function syncCompanyDataFromServer(company?: CompanyId): Promise<void> {
  if (typeof window === "undefined") return
  try {
    const query = company ? `?company=${normalizeCompany(company)}` : ""
    const res = await fetch(`/api/company-data${query}`, { cache: "no-store" })
    if (!res.ok) return
    const json = await res.json()
    const remote = json?.data as Partial<StoredCompanyData> | undefined
    if (!remote) return
    const next: StoredCompanyData = {
      suppliers:           Array.isArray(remote.suppliers)           ? remote.suppliers           : [],
      cost_centers:        Array.isArray(remote.cost_centers)        ? remote.cost_centers        : [],
      managers:            Array.isArray(remote.managers)            ? remote.managers            : [],
      authorized_managers: Array.isArray(remote.authorized_managers) ? remote.authorized_managers : [],
      carriers:            Array.isArray(remote.carriers)            ? remote.carriers            : [],
      departments:         Array.isArray(remote.departments)         ? remote.departments         : [],
      sectors:             Array.isArray(remote.sectors)             ? remote.sectors             : [],
    }
    const resolvedCompany = company ? normalizeCompany(company) : normalizeCompany(json?.company)
    if (!company) localStorage.setItem(ACTIVE_COMPANY_KEY, resolvedCompany)
    localStorage.setItem(storageKey(resolvedCompany), JSON.stringify(next))
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

export function getCompanyData(company?: CompanyId): CompanyData {
  const raw = readRaw(company)
  return {
    suppliers: raw.suppliers,
    cost_centers: raw.cost_centers,
    managers: raw.managers.map(managerName),
    authorized_managers: raw.authorized_managers.map(managerName),
    carriers: raw.carriers,
    departments: raw.departments,
    sectors: raw.sectors,
  }
}

export function saveCompanyData(data: CompanyData, company?: CompanyId): void {
  // Preserve existing manager emails when callers save the names-only view.
  const existing = readRaw(company)

  const existingMap = new Map<string, Manager>()
  for (const m of existing.managers) {
    if (typeof m === "string") existingMap.set(m.toLowerCase(), { name: m, email: "" })
    else existingMap.set(m.name.toLowerCase(), m)
  }
  const merged: Array<string | Manager> = data.managers.map((name) => {
    const prior = existingMap.get(name.toLowerCase())
    return prior ?? { name, email: "" }
  })

  const existingAuthMap = new Map<string, Manager>()
  for (const m of existing.authorized_managers) {
    if (typeof m === "string") existingAuthMap.set(m.toLowerCase(), { name: m, email: "" })
    else existingAuthMap.set(m.name.toLowerCase(), m)
  }
  const mergedAuth: Array<string | Manager> = (data.authorized_managers ?? []).map((name) => {
    const prior = existingAuthMap.get(name.toLowerCase())
    return prior ?? { name, email: "" }
  })

  writeRaw({
    suppliers: data.suppliers,
    cost_centers: data.cost_centers,
    managers: merged,
    authorized_managers: mergedAuth,
    carriers: data.carriers,
    departments: data.departments,
    sectors: data.sectors,
  }, company)
}

export function getList(key: CompanyDataKey, company?: CompanyId): string[] {
  return getCompanyData(company)[key]
}

export function saveList(key: CompanyDataKey, items: string[], company?: CompanyId): void {
  const data = getCompanyData(company)
  data[key] = items
  saveCompanyData(data, company)
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

export function getManagers(company?: CompanyId): Manager[] {
  return readRaw(company).managers.map((m) =>
    typeof m === "string" ? { name: m, email: "" } : { name: m.name, email: m.email ?? "" }
  )
}

export function saveManagers(managers: Manager[], company?: CompanyId): void {
  const raw = readRaw(company)
  raw.managers = managers.map((m) => ({ name: m.name.trim(), email: m.email.trim() }))
  writeRaw(raw, company)
}

export function getManagerEmail(name: string, company?: CompanyId): string | undefined {
  const trimmed = name.trim().toLowerCase()
  if (!trimmed) return undefined
  for (const m of getManagers(company)) {
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

// ── Authorized Managers (with email) ────────────────────────────────────────

export function getAuthorizedManagers(company?: CompanyId): Manager[] {
  return readRaw(company).authorized_managers.map((m) =>
    typeof m === "string" ? { name: m, email: "" } : { name: m.name, email: m.email ?? "" }
  )
}

export function saveAuthorizedManagers(managers: Manager[], company?: CompanyId): void {
  const raw = readRaw(company)
  raw.authorized_managers = managers.map((m) => ({ name: m.name.trim(), email: m.email.trim() }))
  writeRaw(raw, company)
}

export function getAuthorizedManagerEmail(name: string, company?: CompanyId): string | undefined {
  const trimmed = name.trim().toLowerCase()
  if (!trimmed) return undefined
  for (const m of getAuthorizedManagers(company)) {
    if (m.name.toLowerCase() === trimmed) return m.email || undefined
  }
  if (trimmed.includes("@")) return name.trim()
  return undefined
}

export function upsertAuthorizedManager(name: string, email: string): boolean {
  const cleanName = name.trim()
  const cleanEmail = email.trim()
  if (!cleanName) return false
  const list = getAuthorizedManagers()
  const idx = list.findIndex((m) => m.name.toLowerCase() === cleanName.toLowerCase())
  if (idx >= 0) {
    if (list[idx].email === cleanEmail) return false
    list[idx] = { name: cleanName, email: cleanEmail }
  } else {
    list.push({ name: cleanName, email: cleanEmail })
  }
  saveAuthorizedManagers(list)
  return true
}
