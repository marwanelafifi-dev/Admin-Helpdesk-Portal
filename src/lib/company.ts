export const COMPANY_IDS = ["siware", "buchi"] as const

export type CompanyId = (typeof COMPANY_IDS)[number]

export const COMPANY_LABELS: Record<CompanyId, string> = {
  siware: "Si-Ware Systems",
  buchi: "BUCHI",
}

export function normalizeCompany(value?: string | null): CompanyId {
  return value?.trim().toLowerCase() === "buchi" ? "buchi" : "siware"
}

/** Resolve the requester's company without changing the existing user schema. */
export function companyFromEmail(email?: string | null): CompanyId {
  const domain = email?.trim().toLowerCase().split("@")[1] ?? ""
  return domain === "buchi.com" || domain.endsWith(".buchi.com") || domain === "buchigroup.com"
    ? "buchi"
    : "siware"
}
