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
  "Others": string
  "Others Amount": number | string
  "Currency": string
  "Estimated Total Costs": number | string
  "Description": string
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
    "Others": payload?.others || "",
    "Others Amount": payload?.othersAmount ?? "",
    "Currency": payload?.currency || "EGP",
    "Estimated Total Costs": payload?.estimatedTotalCosts ?? "",
    "Description": request.description || "",
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

  // Create XLSX workbook
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.aoa_to_sheet([
    headers,
    ...rows.map((row) => headers.map((h) => row[h as keyof TravelExportRow])),
  ])

  // Set column widths for better readability
  const columnWidths = headers.map((h) => ({
    wch: Math.max(h.length, 15),
  }))
  worksheet["!cols"] = columnWidths

  // Add some styling to header row (optional)
  const headerStyle = {
    fill: { fgColor: { rgb: "FF14B8A6" } }, // Teal background
    font: { bold: true, color: { rgb: "FFFFFFFF" } }, // White text
    alignment: { horizontal: "center", vertical: "center" },
  }

  // Apply header styling to first row
  headers.forEach((_, colIndex) => {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: colIndex })
    if (!worksheet[cellRef]) worksheet[cellRef] = {}
    worksheet[cellRef].s = headerStyle
  })

  XLSX.utils.book_append_sheet(workbook, worksheet, "Travel Requests")

  // Generate Excel file
  XLSX.writeFile(workbook, `travel-requests-${new Date().toISOString().split("T")[0]}.xlsx`)
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
