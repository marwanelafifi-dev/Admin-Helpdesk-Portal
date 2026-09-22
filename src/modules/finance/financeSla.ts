// Retained for compatibility with existing request payloads.
export const FINANCE_PRIORITIES = ["Normal", "Urgent"] as const
export type FinancePriority = (typeof FINANCE_PRIORITIES)[number]

export const FINANCE_PROCESSING_DAYS = 4
export const FINANCE_REMINDER_DAY = 3

export function normalizeFinanceSlaDays(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10)
  return Number.isInteger(parsed) && parsed >= 2 && parsed <= 60 ? parsed : FINANCE_PROCESSING_DAYS
}

export function normalizeFinanceReminderDay(value: unknown, slaDays: number): number {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10)
  return Number.isInteger(parsed) && parsed >= 1 && parsed < slaDays
    ? parsed
    : Math.min(FINANCE_REMINDER_DAY, slaDays - 1)
}

/** Requests requiring approval begin their processing period after approval. */
export function financeSlaNote(hasApproval: boolean = false, processingDays: number = FINANCE_PROCESSING_DAYS): string {
  return hasApproval
    ? `Your request will be completed within ${processingDays} working days after receiving the required approval.`
    : `Your request will be completed within ${processingDays} working days after submission. If approval is required, this period starts after receiving approval.`
}

export const FINANCE_MISSING_DOCS_NOTE =
  "If any documents are missing, the request will be delayed an extra 2 working days after receiving the missing documents."
