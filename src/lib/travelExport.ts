import type { EngineRequest } from "@/services/engineService"
import * as XLSX from "xlsx"

export interface TravelExportRow {
  "Request ID": string
  "Request Title": string
  "Submission Date": string
  "Requester Name": string
  "Requester Email": string
  "Status": string
  "Last Update Date": string
  "Authorized Manager": string
  "Cost Center": string
  "Division": string
  "Purpose of Trip": string
  "Destination": string
  "Date From": string
  "Date To": string
  "Trip Allowance": number | string
  "Air Ticket": number | string
  "Hotel": number | string
  "Transportation / Car Rental": number | string
  "Others (Specify)": string
  "Others Amount": number | string
  "Currency": string
  "Estimated Total Costs": number | string
  "Payment Method": string
  "Cash Amount": number | string
  "Credit Card Amount": number | string
  "Payment Currency": string
  "Notes": string
}

export function extractTravelRequestData(request: EngineRequest): TravelExportRow {
  const payload = request.payload as any

  return {
    "Request ID": request.id,
    "Request Title": request.title || "",
    "Submission Date": request.createdAt || "",
    "Requester Name": request.requesterName || "",
    "Requester Email": request.requesterEmail || "",
    "Status": request.status || "",
    "Last Update Date": request.updatedAt || "",
    "Authorized Manager": payload?.authorizedManager || "",
    "Cost Center": payload?.costCenter || "",
    "Division": payload?.division || "",
    "Purpose of Trip": payload?.purposeOfTrip || "",
    "Destination": payload?.destination || "",
    "Date From": payload?.dateFrom || "",
    "Date To": payload?.dateTo || "",
    "Trip Allowance": payload?.tripAllowance ?? "",
    "Air Ticket": payload?.airTicket ?? "",
    "Hotel": payload?.hotel ?? "",
    "Transportation / Car Rental": payload?.transportationCarRental ?? "",
    "Others (Specify)": payload?.others || "",
    "Others Amount": payload?.others ? (payload?.othersAmount ?? "") : "",
    "Currency": payload?.currency || "EGP",
    "Estimated Total Costs": payload?.estimatedTotalCosts ?? "",
    "Payment Method": payload?.paymentMethod === "cash" ? "Cash" : payload?.paymentMethod === "company_credit_card" ? "Company Credit Card" : payload?.paymentMethod === "both" ? "Both (Cash + Credit Card)" : "",
    "Cash Amount": payload?.paymentMethod === "cash" ? (payload?.paymentAmount ?? "") : payload?.paymentMethod === "both" ? (payload?.cashAmount ?? "") : "",
    "Credit Card Amount": payload?.paymentMethod === "company_credit_card" ? (payload?.paymentAmount ?? "") : payload?.paymentMethod === "both" ? (payload?.creditCardAmount ?? "") : "",
    "Payment Currency": payload?.paymentCurrency || "EGP",
    "Notes": payload?.notes || "",
  }
}

export function exportToCSV(requests: EngineRequest[], filename = "travel-requests.csv") {
  const rows = requests.map(extractTravelRequestData)

  // Create CSV content with proper escaping
  const headers = Object.keys(rows[0] || {})
  const csvContent = [
    headers.map((h) => `"${h}"`).join(","),
    ...rows.map((row) =>
      headers.map((h) => {
        const value = row[h as keyof TravelExportRow]
        const strValue = String(value || "")
        // Escape quotes and wrap in quotes
        return `"${strValue.replace(/"/g, '""')}"`
      }).join(",")
    ),
  ].join("\n")

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function exportToGoogleSheets(requests: EngineRequest[]) {
  const rows = requests.map(extractTravelRequestData)
  const headers = Object.keys(rows[0] || {})

  // Build TSV (tab-separated) — pastes perfectly into Google Sheets
  const tsvContent = [
    headers.join("\t"),
    ...rows.map((row) =>
      headers.map((h) => {
        const value = row[h as keyof TravelExportRow]
        const str = String(value || "")
        // Escape tabs and newlines in values
        return str.replace(/\t/g, " ").replace(/\n/g, " ")
      }).join("\t")
    ),
  ].join("\n")

  // Copy to clipboard
  navigator.clipboard.writeText(tsvContent).then(() => {
    // Open a new Google Sheets tab
    window.open("https://sheets.new", "_blank")
  }).catch(() => {
    // Fallback: download as XLSX if clipboard fails
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.aoa_to_sheet([
      headers,
      ...rows.map((row) => headers.map((h) => row[h as keyof TravelExportRow])),
    ])
    worksheet["!cols"] = headers.map((h) => ({ wch: Math.max(h.length, 15) }))
    XLSX.utils.book_append_sheet(workbook, worksheet, "Travel Requests")
    XLSX.writeFile(workbook, `travel-requests-${new Date().toISOString().split("T")[0]}.xlsx`)
  })
}

export function exportToGoogleSheetsLink(requests: EngineRequest[]): string {
  const rows = requests.map(extractTravelRequestData)
  const headers = Object.keys(rows[0] || {})

  // Create CSV data URL
  const csvContent = [
    headers.map((h) => `"${h}"`).join(","),
    ...rows.map((row) =>
      headers.map((h) => {
        const value = row[h as keyof TravelExportRow]
        const strValue = String(value || "")
        return `"${strValue.replace(/"/g, '""')}"`
      }).join(",")
    ),
  ].join("\n")

  // URL-encode and create Google Sheets import link
  // This opens Google Sheets and prompts to import the CSV
  const encodedCsv = encodeURIComponent(csvContent)
  return `https://docs.google.com/spreadsheets/d/new?usp=sharing&fvid=${encodedCsv}`
}
