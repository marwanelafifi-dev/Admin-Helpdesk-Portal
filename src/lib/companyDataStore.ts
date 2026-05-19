export type CompanyDataKey =
  | "suppliers"
  | "cost_centers"
  | "managers"
  | "carriers"
  | "departments"
  | "sectors"

export type CompanyData = Record<CompanyDataKey, string[]>

const STORAGE_KEY = "arp_company_data"

// Production defaults: empty. Administrators populate the lists via the
// Admin > Company Data page or via CSV/XLSX import. Empty arrays are
// intentionally preserved by getCompanyData() — see Array.isArray check below.
const DEFAULTS: CompanyData = {
  suppliers: [],
  cost_centers: [],
  managers: [],
  carriers: [],
  departments: [],
  sectors: [],
}

export function getCompanyData(): CompanyData {
  if (typeof window === "undefined") return { ...DEFAULTS }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw) as Partial<CompanyData>
    // Use Array.isArray check so intentionally empty arrays are preserved
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

export function saveCompanyData(data: CompanyData): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function getList(key: CompanyDataKey): string[] {
  return getCompanyData()[key]
}

export function saveList(key: CompanyDataKey, items: string[]): void {
  const data = getCompanyData()
  data[key] = items
  saveCompanyData(data)
}
