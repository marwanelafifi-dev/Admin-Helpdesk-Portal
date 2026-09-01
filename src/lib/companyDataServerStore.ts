import fs from "fs"
import path from "path"
import { normalizeCompany, type CompanyId } from "@/lib/company"

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
  authorized_managers: Array<string | CompanyDataManagerEntry>
  carriers: string[]
  departments: string[]
  sectors: string[]
}

function storePath(company: CompanyId): string {
  return path.join(process.cwd(), "data", company === "buchi" ? "company-data-buchi.json" : "company-data.json")
}

const DEFAULTS: CompanyDataShape = {
  suppliers: [],
  cost_centers: [],
  managers: [],
  authorized_managers: [],
  carriers: [],
  departments: [],
  sectors: [],
}

function ensureStore(company: CompanyId) {
  const target = storePath(company)
  const dir = path.dirname(target)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(target)) fs.writeFileSync(target, JSON.stringify(DEFAULTS, null, 2), "utf-8")
}

export function readCompanyData(company: CompanyId = "siware"): CompanyDataShape {
  company = normalizeCompany(company)
  try {
    ensureStore(company)
    const raw = fs.readFileSync(storePath(company), "utf-8")
    const parsed = JSON.parse(raw) as Partial<CompanyDataShape>
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

export function writeCompanyData(data: CompanyDataShape, company: CompanyId = "siware"): void {
  company = normalizeCompany(company)
  ensureStore(company)
  fs.writeFileSync(storePath(company), JSON.stringify(data, null, 2), "utf-8")
}
