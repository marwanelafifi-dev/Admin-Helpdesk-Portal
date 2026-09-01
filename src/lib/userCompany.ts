export type CompanyId = "si_ware" | "buchi"

export interface UserCompany {
  id: CompanyId
  name: "Si-Ware Systems" | "BUCHI"
}

const COMPANY_BY_DOMAIN: Record<string, UserCompany> = {
  "si-ware.com": { id: "si_ware", name: "Si-Ware Systems" },
  "buchi.com": { id: "buchi", name: "BUCHI" },
}

/** Classify an internal portal user from their email domain. */
export function getCompanyFromEmail(email?: string | null): UserCompany | null {
  const normalized = email?.trim().toLowerCase()
  if (!normalized) return null
  const at = normalized.lastIndexOf("@")
  if (at <= 0 || at === normalized.length - 1) return null
  return COMPANY_BY_DOMAIN[normalized.slice(at + 1)] ?? null
}

/** Shipping always belongs to Si-Ware Systems; other modules follow the requester. */
export function getRequestCompany(module: string, requesterEmail?: string | null): UserCompany | null {
  if (module === "shipping") return COMPANY_BY_DOMAIN["si-ware.com"]
  return getCompanyFromEmail(requesterEmail)
}

export function getDefaultRequesterRoleForEmail(email?: string | null): "Requester - Si-Ware" | "Requester - BUCHI" {
  return getCompanyFromEmail(email)?.id === "buchi" ? "Requester - BUCHI" : "Requester - Si-Ware"
}
