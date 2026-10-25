import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { EngineRequest } from "@/services/engineService"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** "10 Jun 2026" */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

/** "10 Jun 2026 — 11:05 AM" */
export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return "—"
  const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
  return `${date} — ${time}`
}

/** Normalize search text: lowercase and remove spaces */
export function normalizeSearchText(text: string | null | undefined): string {
  if (!text) return ""
  return text.toLowerCase().replace(/\s+/g, "")
}

/** Break a query into independently matchable words, IDs, or email fragments. */
export function searchTerms(query: string | null | undefined): string[] {
  return Array.from(new Set(
    String(query ?? "")
      .trim()
      .split(/\s+/)
      .map(normalizeSearchText)
      .filter(Boolean)
  ))
}

/** Every entered word must occur in the supplied text. */
export function textMatchesSearch(text: string, query: string | null | undefined): boolean {
  const terms = searchTerms(query)
  if (terms.length === 0) return true
  const searchable = normalizeSearchText(text)
  return terms.every((term) => searchable.includes(term))
}

const NON_SEARCHABLE_REQUEST_KEYS = new Set([
  "base64", "filePath",
])

/**
 * Collect every human-readable value in a request. Form schemas differ by
 * module and change over time, so a generic traversal keeps Administration
 * search complete without needing a hand-maintained allow-list of fields.
 * Attachment bytes and storage paths are deliberately excluded: file names
 * remain searchable, while large data URLs never enter the browser index.
 */
function collectRequestSearchValues(value: unknown, values: string[], seen: WeakSet<object>): void {
  if (value === null || value === undefined) return
  if (typeof value === "string") {
    if (!value.startsWith("data:")) values.push(value)
    return
  }
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    values.push(String(value))
    return
  }
  if (value instanceof Date) {
    values.push(value.toISOString())
    return
  }
  if (typeof value !== "object" || seen.has(value)) return
  seen.add(value)

  if (Array.isArray(value)) {
    value.forEach((item) => collectRequestSearchValues(item, values, seen))
    return
  }

  for (const [key, item] of Object.entries(value)) {
    if (NON_SEARCHABLE_REQUEST_KEYS.has(key.toLowerCase())) continue
    collectRequestSearchValues(item, values, seen)
  }
}

/** Text index for all non-binary request fields, including dynamic form data. */
export function getRequestSearchText(request: EngineRequest): string {
  const values: string[] = []
  collectRequestSearchValues(request, values, new WeakSet<object>())
  return values.join(" ")
}

export function requestMatchesSearch(request: EngineRequest, query: string | null | undefined): boolean {
  return textMatchesSearch(getRequestSearchText(request), query)
}

/** Extract searchable text from request payload based on module type */
export function getSearchablePayloadText(request: EngineRequest): string {
  const payload = request.payload as Record<string, unknown>
  const searchableParts: string[] = []

  // Module-specific searchable fields
  switch (request.module) {
    case "shipping":
      if (payload.trackingNumber) searchableParts.push(String(payload.trackingNumber))
      if (payload.supplier) searchableParts.push(String(payload.supplier))
      if (payload.carrier) searchableParts.push(String(payload.carrier))
      break
    case "purchase":
      if (payload.supplier) searchableParts.push(String(payload.supplier))
      if (payload.productUrl) searchableParts.push(String(payload.productUrl))
      if (payload.itemName) searchableParts.push(String(payload.itemName))
      break
    case "hr":
      if (payload.employeeId) searchableParts.push(String(payload.employeeId))
      if (payload.employeeName) searchableParts.push(String(payload.employeeName))
      break
    case "travel":
      if (payload.destination) searchableParts.push(String(payload.destination))
      break
    case "event":
      if (payload.location) searchableParts.push(String(payload.location))
      if (payload.eventLocationType === "internal" && payload.floorNumber) {
        searchableParts.push(String(payload.floorNumber))
      }
      if (payload.eventLocationType === "external" && payload.addressOrUrl) {
        searchableParts.push(String(payload.addressOrUrl))
      }
      break
    case "maintenance":
      if (payload.priority) searchableParts.push(String(payload.priority))
      break
    case "general":
      // General module doesn't have specific payload fields to search
      break
    case "finance_reimbursement":
      if (payload.costCenter) searchableParts.push(String(payload.costCenter))
      if (Array.isArray(payload.poNumbers)) searchableParts.push(payload.poNumbers.join(" "))
      if (Array.isArray(payload.expenseRows)) {
        for (const item of payload.expenseRows) {
          const row = item as Record<string, unknown>
          searchableParts.push(String(row.po ?? ""), String(row.description ?? ""), String(row.costCenter ?? ""), String(row.currency ?? ""), String(row.amount ?? ""))
        }
      }
      if (payload.directManager) searchableParts.push(String(payload.directManager))
      break
    case "finance_travel_reimbursement":
      if (payload.costCenter) searchableParts.push(String(payload.costCenter))
      if (payload.authorizedManager) searchableParts.push(String(payload.authorizedManager))
      if (Array.isArray(payload.expenseRows)) {
        for (const item of payload.expenseRows) {
          const row = item as Record<string, unknown>
          searchableParts.push(String(row.description ?? ""), String(row.otherDescription ?? ""), String(row.usdAmount ?? ""), String(row.eurAmount ?? ""), String(row.egpAmount ?? ""))
        }
      }
      break
    case "finance_invoice_payment":
      if (payload.supplier) searchableParts.push(String(payload.supplier))
      if (Array.isArray(payload.poNumbers)) searchableParts.push(payload.poNumbers.join(" "))
      if (payload.otherDetails) searchableParts.push(String(payload.otherDetails))
      break
  }

  return searchableParts.join(" ")
}
