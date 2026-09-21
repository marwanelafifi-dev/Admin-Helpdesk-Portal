// Retained for compatibility with existing request payloads.
export const FINANCE_PRIORITIES = ["Normal", "Urgent"] as const
export type FinancePriority = (typeof FINANCE_PRIORITIES)[number]

export const FINANCE_PROCESSING_DAYS = 4

/** Requests requiring approval begin their processing period after approval. */
export function financeSlaNote(hasApproval: boolean = false): string {
  return hasApproval
    ? `Your request will be completed within ${FINANCE_PROCESSING_DAYS} working days after receiving the required approval.`
    : `Your request will be completed within ${FINANCE_PROCESSING_DAYS} working days after submission. If approval is required, this period starts after receiving approval.`
}

export const FINANCE_MISSING_DOCS_NOTE =
  "If any documents are missing, the request will be delayed an extra 2 working days after receiving the missing documents."
