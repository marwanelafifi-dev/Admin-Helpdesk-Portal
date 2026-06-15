import fs from "fs"
import path from "path"

/**
 * Server-side persistence for Company Data — mirrors the proven
 * data/comments.json + data/feedback.json pattern.
 *
 * The browser-facing companyDataStore.ts still reads/writes localStorage
 * for synchronous access from the rendering paths. A small sync hook
 * fetches this server store on app load and overwrites the local cache,
 * and every mutation pushes back here. That way all users see the same
 * suppliers / cost centers / managers / departments / sectors / carriers.
 */

export interface CompanyDataManagerEntry {
  name: string
  email: string
}

export interface CompanyDataShape {
  suppliers: string[]
  cost_centers: string[]
  managers: Array<string | CompanyDataManagerEntry>
  carriers: string[]
  departments: string[]
  sectors: string[]
}

const STORE_PATH = path.join(process.cwd(), "data", "company-data.json")

const DEFAULTS: CompanyDataShape = {
  suppliers: [],
  cost_centers: [],
  managers: [],
  carriers: [],
  departments: [],
  sectors: [],
}

function ensureStore() {
  const dir = path.dirname(STORE_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(STORE_PATH)) fs.writeFileSync(STORE_PATH, JSON.stringify(DEFAULTS, null, 2), "utf-8")
}

export function readCompanyData(): CompanyDataShape {
  try {
    ensureStore()
    const raw = fs.readFileSync(STORE_PATH, "utf-8")
    const parsed = JSON.parse(raw) as Partial<CompanyDataShape>
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

export function writeCompanyData(data: CompanyDataShape): void {
  ensureStore()
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf-8")
}
