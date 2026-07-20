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
  }

  return searchableParts.join(" ")
}
