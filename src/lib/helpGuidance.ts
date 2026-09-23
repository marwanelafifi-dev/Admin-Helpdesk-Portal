export type HelpFunction = "Administration" | "People" | "Finance"

export type ModuleGuide = {
  id: string
  label: string
  function: HelpFunction
  startPath: string
  paths: string[]
  summary: string
  notes: string[]
  afterSubmit: string
}

/**
 * The request guidance shown both from the Help icon and before a user's
 * first request in a module. Keep operational instructions here so they are
 * consistent wherever a user enters the module.
 */
export const MODULE_GUIDES: ModuleGuide[] = [
  {
    id: "shipping", label: "Shipping", function: "Administration", startPath: "/shipping", paths: ["/shipping", "/shipping/new"],
    summary: "Submit import or export shipping work for Administration to process.",
    notes: ["Choose the correct direction and give the shipment a clear title.", "Provide the supplier, carrier, tracking and document details that are available.", "Attach the required shipping documents before submitting."],
    afterSubmit: "Track the request in My Requests. Shipping requests may require manager approval before processing starts.",
  },
  {
    id: "shipping-sending", label: "Shipping — Export", function: "Administration", startPath: "/shipping/sending", paths: ["/shipping/sending", "/shipping/sending/new"],
    summary: "Request an outbound shipment through the Administration team.",
    notes: ["Add complete sender, recipient and item details.", "Confirm the shipment method and deadline before submitting.", "Attach invoices or other export documents when required."],
    afterSubmit: "Track the request in My Requests. It may need manager approval before processing starts.",
  },
  {
    id: "shipping-receiving", label: "Shipping — Import", function: "Administration", startPath: "/shipping/receiving", paths: ["/shipping/receiving", "/shipping/receiving/new"],
    summary: "Request support for an incoming shipment through the Administration team.",
    notes: ["Add the supplier, carrier, tracking and expected arrival details.", "Describe the items and receiving requirements clearly.", "Attach shipping or customs documents that are already available."],
    afterSubmit: "Track the request in My Requests. It may need manager approval before processing starts.",
  },
  {
    id: "hr", label: "HR Onboarding & Offboarding", function: "Administration", startPath: "/hr", paths: ["/hr", "/hr/new", "/hr/onboarding", "/hr/offboarding"],
    summary: "Request Administration support for a new starter or departing employee.",
    notes: ["Select Onboarding or Offboarding and complete the employee details accurately.", "Provide the sector, department, direct manager and relevant dates.", "Select every required item, such as access card, medical insurance or seating."],
    afterSubmit: "Use My Requests to follow progress and answer any questions from the Administration team.",
  },
  {
    id: "maintenance", label: "Maintenance", function: "Administration", startPath: "/maintenance", paths: ["/maintenance", "/maintenance/new"],
    summary: "Report a facilities or maintenance issue to the Administration team.",
    notes: ["Use a specific title and describe the issue, location and impact.", "Add photos or files that help the team identify the problem.", "Mark urgent issues accurately so the team can prioritize them."],
    afterSubmit: "Track progress in My Requests and add a comment if the situation changes.",
  },
  {
    id: "purchase", label: "Purchase", function: "Administration", startPath: "/purchase", paths: ["/purchase", "/purchase/new"],
    summary: "Request items or services for the Administration team to purchase.",
    notes: ["List each requested item with quantity, estimated cost and supplier when known.", "Explain the business need and attach quotations or links where available.", "Check the request carefully because it will be sent for manager approval."],
    afterSubmit: "Track the approval and processing status in My Requests.",
  },
  {
    id: "event", label: "Event", function: "Administration", startPath: "/event", paths: ["/event", "/event/new"],
    summary: "Request support for an event, meeting or activity.",
    notes: ["Provide the event date, time, location and expected attendance.", "Describe the services, setup or materials needed.", "Submit early enough for the team to arrange suppliers and facilities."],
    afterSubmit: "Track the request in My Requests and update it if event details change.",
  },
  {
    id: "travel", label: "Travel", function: "Administration", startPath: "/travel", paths: ["/travel", "/travel/new"],
    summary: "Request travel arrangements through the Administration team.",
    notes: ["Enter travel dates, destination and the business purpose accurately.", "Provide passport, flight, hotel or visa documents where the form requests them.", "Review dates and traveler details before submitting."],
    afterSubmit: "Track the request in My Requests and respond quickly if the team requests clarification.",
  },
  {
    id: "general", label: "General Request", function: "Administration", startPath: "/general", paths: ["/general", "/general/new"],
    summary: "Send a request that does not fit another Administration service.",
    notes: ["Use a clear title that describes the outcome you need.", "Include enough context, dates and affected people for the team to act.", "Attach supporting files when they explain the request."],
    afterSubmit: "Track the request in My Requests and use comments for any follow-up information.",
  },
  {
    id: "hr_general", label: "People General Request", function: "People", startPath: "/departments/hr/general", paths: ["/departments/hr/general", "/departments/hr/general/new"],
    summary: "Send a general request to the People Team.",
    notes: ["Use a clear title and explain the People-related support you need.", "Include relevant dates, employee details and supporting context.", "Attach documents that help the People Team process the request."],
    afterSubmit: "Track the request in People My Requests and add a comment if information changes.",
  },
  {
    id: "hr_letter", label: "HR Letter Request", function: "People", startPath: "/departments/hr/letter", paths: ["/departments/hr/letter", "/departments/hr/letter/new"],
    summary: "Request an official letter or certificate from the People Team.",
    notes: ["Choose the letter type and provide your direct manager.", "For travel or other letters, add the destination entity, language and required information.", "Attach your passport when the selected letter type requires it."],
    afterSubmit: "Track the request in People My Requests. The People Team will contact you if anything is missing.",
  },
  {
    id: "finance_reimbursement", label: "General Reimbursement", function: "Finance", startPath: "/departments/finance/reimbursement", paths: ["/departments/finance/reimbursement", "/departments/finance/reimbursement/new"],
    summary: "Claim an eligible general business expense from Finance.",
    notes: ["Enter the expense details, amount and business purpose accurately.", "Attach the receipt or supporting document for each claimed expense.", "Select the direct manager who must approve the reimbursement."],
    afterSubmit: "Track approval and payment progress in Finance My Requests.",
  },
  {
    id: "finance_travel_reimbursement", label: "Travel Reimbursement", function: "Finance", startPath: "/departments/finance/travel-reimbursement", paths: ["/departments/finance/travel-reimbursement", "/departments/finance/travel-reimbursement/new"],
    summary: "Claim eligible travel expenses from Finance.",
    notes: ["Enter each travel expense with dates, amount and business purpose.", "Attach receipts and the reimbursement form required by the request.", "Select the authorized manager who will approve the claim."],
    afterSubmit: "Track approval and payment progress in Finance My Requests.",
  },
  {
    id: "finance_invoice_payment", label: "Invoice Payment", function: "Finance", startPath: "/departments/finance/invoices", paths: ["/departments/finance/invoices", "/departments/finance/invoices/new"],
    summary: "Submit a supplier invoice for Finance to process.",
    notes: ["Enter the supplier, invoice number, PO number and payment details accurately.", "Attach the invoice and all required supporting documents.", "Check invoice rows and totals before submitting."],
    afterSubmit: "Track the payment request in Finance My Requests and respond if Finance needs clarification.",
  },
]

export function getModuleGuide(moduleId: string | null | undefined) {
  return MODULE_GUIDES.find((guide) => guide.id === moduleId)
}

export function getModuleGuideForPath(pathname: string) {
  return [...MODULE_GUIDES]
    .sort((a, b) => Math.max(...b.paths.map((path) => path.length)) - Math.max(...a.paths.map((path) => path.length)))
    .find((guide) => guide.paths.some((path) => pathname === path || pathname.startsWith(`${path}/`)))
}
