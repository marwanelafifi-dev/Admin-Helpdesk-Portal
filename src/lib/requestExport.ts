import type { EngineRequest } from "@/services/engineService"
import * as XLSX from "xlsx"

type ExportRow = Record<string, string>

const COMMON_HEADERS = [
  "Request ID",
  "Request Title",
  "Module",
  "Status",
  "Requester Name",
  "Requester Email",
  "Company",
  "Assigned To",
  "Assigned To Email",
  "CC Recipients",
  "Created",
  "Last Updated",
]

const MODULE_LABELS: Record<string, string> = {
  shipping: "Shipping",
  maintenance: "Maintenance",
  purchase: "Purchase",
  event: "Event",
  travel: "Travel",
  general: "General Request",
  hr: "HR Onboarding / Offboarding",
  hr_general: "People General Request",
  hr_letter: "HR Letter Request",
  hr_travel_letter: "HR Travel Letter Request",
  finance_reimbursement: "Finance Reimbursement",
  finance_travel_reimbursement: "Finance Travel Reimbursement",
  finance_invoice_payment: "Finance Invoice Payment",
}

export function humanizeExportKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

export function requestModuleLabel(moduleId: string): string {
  return MODULE_LABELS[moduleId] ?? humanizeExportKey(moduleId)
}

function exportValue(value: unknown): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value)
  if (Array.isArray(value)) return value.map(exportValue).filter(Boolean).join("; ")
  if (typeof value === "object") {
    const record = value as Record<string, unknown>
    const attachmentName = record.name ?? record.fileName
    if (typeof attachmentName === "string") return attachmentName
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

function csvCell(value: unknown): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`
}

function requestCcRecipients(request: EngineRequest): string {
  const formRecipients = Array.isArray((request.payload as Record<string, unknown>)?.ccEmails)
    ? (request.payload as Record<string, unknown>).ccEmails as unknown[]
    : []
  return [...formRecipients, ...(Array.isArray(request.adminCc) ? request.adminCc : [])]
    .map((email) => String(email).trim())
    .filter((email, index, values) => email && values.findIndex((item) => item.toLowerCase() === email.toLowerCase()) === index)
    .join("; ")
}

/**
 * Flattens a set of request records into one spreadsheet-ready data table.
 * Module-specific payload fields are prefixed with their module label, so an
 * All Requests export has unambiguous columns while module-only exports stay
 * easy to read.
 */
export function requestExportTable(requests: EngineRequest[]): { headers: string[]; rows: string[][] } {
  const dynamicHeaders = new Set<string>()
  const rowObjects: ExportRow[] = requests.map((request) => {
    const moduleLabel = requestModuleLabel(request.module)
    const row: ExportRow = {
      "Request ID": request.id,
      "Request Title": request.title,
      "Module": moduleLabel,
      "Status": humanizeExportKey(request.status),
      "Requester Name": request.requesterName,
      "Requester Email": request.requesterEmail,
      "Company": request.companyName ?? "",
      "Assigned To": request.assignedToName ?? "",
      "Assigned To Email": request.assignedToEmail ?? "",
      "CC Recipients": requestCcRecipients(request),
      "Created": request.createdAt,
      "Last Updated": request.updatedAt,
    }

    const description = (request.payload as Record<string, unknown>)?.description
      || (request.payload as Record<string, unknown>)?.requestDescription
    if (description) {
      const header = `${moduleLabel} — Description`
      row[header] = exportValue(description)
      dynamicHeaders.add(header)
    }

    for (const [key, value] of Object.entries((request.payload ?? {}) as Record<string, unknown>)) {
      if (key === "ccEmails" || key === "description" || key === "requestDescription") continue
      const header = `${moduleLabel} — ${humanizeExportKey(key)}`
      row[header] = exportValue(value)
      dynamicHeaders.add(header)
    }
    return row
  })

  const headers = [...COMMON_HEADERS, ...Array.from(dynamicHeaders).sort((a, b) => a.localeCompare(b))]
  return { headers, rows: rowObjects.map((row) => headers.map((header) => row[header] ?? "")) }
}

export function downloadRequestCsv(requests: EngineRequest[], filename: string): void {
  const { headers, rows } = requestExportTable(requests)
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" })
  const href = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = href
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(href)
}

/**
 * Creates a populated workbook rather than relying on clipboard data. Google
 * Sheets opens XLSX files natively, while Excel users keep the same columns
 * and values without an import/paste step.
 */
export function downloadRequestSpreadsheet(requests: EngineRequest[], filename: string): void {
  const { headers, rows } = requestExportTable(requests)
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
  worksheet["!cols"] = headers.map((header, index) => {
    const longestValue = Math.max(header.length, ...rows.map((row) => String(row[index] ?? "").length))
    return { wch: Math.min(Math.max(longestValue + 2, 14), 46) }
  })
  worksheet["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: Math.max(headers.length - 1, 0) } }) }

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Requests")
  XLSX.writeFile(workbook, filename, { compression: true })
}

export function requestExportTsv(requests: EngineRequest[]): string {
  const { headers, rows } = requestExportTable(requests)
  return [headers, ...rows]
    .map((row) => row.map((value) => String(value).replace(/[\t\r\n]+/g, " ")).join("\t"))
    .join("\n")
}
