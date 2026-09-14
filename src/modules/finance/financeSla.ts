export const FINANCE_PRIORITIES = ["Normal", "Urgent"] as const
export type FinancePriority = (typeof FINANCE_PRIORITIES)[number]

/** Working-day SLA promised to the requester per priority, shown as a note on every Finance request form. */
export const FINANCE_PRIORITY_SLA_DAYS: Record<FinancePriority, number> = {
  Normal: 4,
  Urgent: 2,
}

/**
 * @param hasApproval Whether this specific request goes through a manager/
 * approver approval cycle. When it does, the SLA clock only starts once
 * approval is received; when it doesn't, the SLA note applies as-is from
 * submission.
 */
export function financeSlaNote(priority: FinancePriority, hasApproval: boolean = false): string {
  const base = `Will be finished within ${FINANCE_PRIORITY_SLA_DAYS[priority]} Working Days`
  return hasApproval ? `${base} after receiving approval` : base
}

export const FINANCE_MISSING_DOCS_NOTE =
  "If any documents are missing, the request will be delayed an extra 2 working days after receiving the missing documents."
