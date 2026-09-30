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
  comments: string
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
    notes: ["Choose the correct direction and give the shipment a clear title.", "Provide the supplier, cost center, PO number, direct manager, shipment description and required delivery date.", "Attach the required documents: export needs a Commercial Invoice; supplier import needs a Commercial Invoice and AWB; Si-Ware import needs a Commercial Invoice and Packing List."],
    afterSubmit: "Track the request in My Requests. Shipping requests may require manager approval before processing starts.",
    comments: "Add a comment when the carrier, tracking number, ETA, customs status, or shipping documents change.",
  },
  {
    id: "shipping-sending", label: "Shipping — Export", function: "Administration", startPath: "/shipping/sending", paths: ["/shipping/sending", "/shipping/sending/new"],
    summary: "Request an outbound shipment through the Administration team.",
    notes: ["Add the supplier, cost center, PO number, direct manager and a clear shipment description.", "Provide carrier, tracking and pickup details when available, and enter the required delivery date.", "Attach the Commercial Invoice required for every export shipment."],
    afterSubmit: "Track the request in My Requests. It may need manager approval before processing starts.",
    comments: "Use comments for a revised collection date, recipient details, tracking number, export-document update, or delivery issue.",
  },
  {
    id: "shipping-receiving", label: "Shipping — Import", function: "Administration", startPath: "/shipping/receiving", paths: ["/shipping/receiving", "/shipping/receiving/new"],
    summary: "Request support for an incoming shipment through the Administration team.",
    notes: ["Add the supplier, cost center, PO number, direct manager and a clear shipment description.", "Provide carrier, tracking and expected delivery details; name the supplier or carrier when selecting Other.", "For Supplier Will Ship, attach a Commercial Invoice and AWB. For Si-Ware Will Ship, attach a Commercial Invoice and Packing List."],
    afterSubmit: "Track the request in My Requests. It may need manager approval before processing starts.",
    comments: "Use comments to report an updated ETA, customs-clearance progress, a changed carrier, or additional receiving instructions.",
  },
  {
    id: "hr", label: "HR Onboarding & Offboarding", function: "Administration", startPath: "/hr", paths: ["/hr", "/hr/new", "/hr/onboarding", "/hr/offboarding"],
    summary: "Request Administration support for a new starter or departing employee.",
    notes: ["Select Onboarding or Offboarding and complete the employee details accurately.", "Provide the sector, department, direct manager and relevant dates.", "Select every required item, such as access card, medical insurance or seating."],
    afterSubmit: "Use My Requests to follow progress and answer any questions from the Administration team.",
    comments: "Use comments for a changed start or last-working date, manager, department, access requirement, or any item added after submission.",
  },
  {
    id: "maintenance", label: "Maintenance", function: "Administration", startPath: "/maintenance", paths: ["/maintenance", "/maintenance/new"],
    summary: "Report a facilities or maintenance issue to the Administration team.",
    notes: ["Use a specific title and describe the issue, location and impact.", "Add photos or files that help the team identify the problem.", "Mark urgent issues accurately so the team can prioritize them."],
    afterSubmit: "Track progress in My Requests and add a comment if the situation changes.",
    comments: "Use comments to report that the issue has worsened, changed location, affects safety or operations, or is no longer present. Add new photos when useful.",
  },
  {
    id: "purchase", label: "Purchase", function: "Administration", startPath: "/purchase", paths: ["/purchase", "/purchase/new"],
    summary: "Request items or services for the Administration team to purchase.",
    notes: ["List each requested item with quantity, estimated cost and supplier when known.", "Explain the business need and attach quotations or links where available.", "Check the request carefully because it will be sent for manager approval."],
    afterSubmit: "Track the approval and processing status in My Requests.",
    comments: "Use comments for a revised quantity, supplier, quotation, budget information, delivery requirement, or clarification requested by Administration.",
  },
  {
    id: "event", label: "Event", function: "Administration", startPath: "/event", paths: ["/event", "/event/new"],
    summary: "Request support for an event, meeting or activity.",
    notes: ["Provide the event date, time, location and expected attendance.", "Describe the services, setup or materials needed.", "Submit early enough for the team to arrange suppliers and facilities."],
    afterSubmit: "Track the request in My Requests for approval and processing progress.",
    comments: "Use comments for changed dates, attendance, location, setup, catering, supplier details, or other event requirements.",
  },
  {
    id: "travel", label: "Travel", function: "Administration", startPath: "/travel", paths: ["/travel", "/travel/new"],
    summary: "Request travel arrangements through the Administration team.",
    notes: ["Select the authorized manager, cost center, division, request type and trip purpose accurately.", "Enter the destination, travel dates, required travel items and expected costs before submitting.", "Attach a passport; attach an Aman Sticker for visa applications and an invitation letter only when requesting an HR letter."],
    afterSubmit: "Track the request in My Requests and respond quickly if the team requests clarification.",
    comments: "Use comments for a changed itinerary, traveller detail, passport or visa document, hotel preference, or urgent travel clarification.",
  },
  {
    id: "general", label: "General Request", function: "Administration", startPath: "/general", paths: ["/general", "/general/new"],
    summary: "Send a request that does not fit another Administration service.",
    notes: ["Use a clear title that describes the outcome you need.", "Include enough context, dates and affected people for the team to act.", "Attach supporting files when they explain the request."],
    afterSubmit: "Track the request in My Requests and use comments for any follow-up information.",
    comments: "Use comments to provide requested clarification, a new date, a changed contact, or follow-up details.",
  },
  {
    id: "hr_general", label: "People General Request", function: "People", startPath: "/departments/hr/general", paths: ["/departments/hr/general", "/departments/hr/general/new"],
    summary: "Send a general request to the People Team.",
    notes: ["Use a clear title and explain the People-related support you need.", "Include relevant dates, employee details and supporting context.", "Attach documents that help the People Team process the request."],
    afterSubmit: "Track the request in People My Requests and add a comment if information changes.",
    comments: "Use comments to add relevant dates, employee details, policy context, or a clarification requested by the People Team. Do not post unnecessary sensitive personal information.",
  },
  {
    id: "hr_letter", label: "HR Letter Request", function: "People", startPath: "/departments/hr/letter", paths: ["/departments/hr/letter", "/departments/hr/letter/new"],
    summary: "Request an official letter or certificate from the People Team.",
    notes: ["Choose the letter type and provide your Direct Manager.", "For a personal travel letter, enter the embassy and travel dates and attach your passport.", "For Others, enter the addressed entity, select Arabic or English, choose the information to include, and state the purpose."],
    afterSubmit: "Track the request in People My Requests. The People Team will contact you if anything is missing.",
    comments: "Use comments for a corrected recipient, destination entity, language, required wording, delivery deadline, or missing document requested by the People Team.",
  },
  {
    id: "finance_reimbursement", label: "General Reimbursement", function: "Finance", startPath: "/departments/finance/reimbursement", paths: ["/departments/finance/reimbursement", "/departments/finance/reimbursement/new"],
    summary: "Claim an eligible general business expense from Finance.",
    notes: ["Enter each expense description, cost center, invoice amount and currency, refund amount and refund currency accurately.", "Attach the required supporting document; when paid by personal credit card, also attach the required payment evidence.", "Enter a PO number for every row when the request has a PO, or select a Direct Manager when it has no PO."],
    afterSubmit: "Track approval and payment progress in Finance My Requests.",
    comments: "Use comments to answer Finance questions, add a missing receipt, explain a correction, or provide a payment-related clarification.",
  },
  {
    id: "finance_travel_reimbursement", label: "Travel Reimbursement", function: "Finance", startPath: "/departments/finance/travel-reimbursement", paths: ["/departments/finance/travel-reimbursement", "/departments/finance/travel-reimbursement/new"],
    summary: "Claim eligible travel expenses from Finance.",
    notes: ["Enter the cost center and each expense description, invoice amount and currency, refund amount and refund currency accurately.", "Attach the required supporting document; when paid by personal credit card, also attach the required payment evidence.", "Select the authorized manager who will approve the claim and provide a detail when the expense description is Others."],
    afterSubmit: "Track approval and payment progress in Finance My Requests.",
    comments: "Use comments to add a missing receipt, clarify an itinerary or expense, or answer Finance questions.",
  },
  {
    id: "finance_invoice_payment", label: "Pre Paid Invoice", function: "Finance", startPath: "/departments/finance/invoices", paths: ["/departments/finance/invoices", "/departments/finance/invoices/new"],
    summary: "Submit a pre paid supplier invoice for Finance to process.",
    notes: ["Enter the supplier, PO or contract type, invoice amount, currency and payment method for every row.", "Attach the required vendor invoice document and any supporting files.", "Enter a PO number for every PO-backed row; for Contract or Other requests, select a Direct Manager and enter a supplier name when using Other."],
    afterSubmit: "Track the pre paid invoice request in Finance My Requests and respond if Finance needs clarification.",
    comments: "Use comments for an invoice correction, supplier or PO clarification, or documents requested by Finance.",
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
