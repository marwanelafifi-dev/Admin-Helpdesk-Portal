export interface RequestBackDestination {
  href: string
  label: string
}

const SOURCE_DESTINATIONS: Record<string, RequestBackDestination> = {
  "all-requests": { href: "/admin/all-requests", label: "Back to All Requests" },
  "team-requests": { href: "/team-requests", label: "Back to Team Requests" },
  "finance-team-requests": { href: "/departments/finance/team-requests", label: "Back to Finance Team Requests" },
  "people-team-requests": { href: "/departments/hr/team-requests", label: "Back to People Team Requests" },
  "shipping": { href: "/shipping", label: "Back to Shipping Requests" },
  "shipping-sending": { href: "/shipping/sending", label: "Back to Export Requests" },
  "shipping-receiving": { href: "/shipping/receiving", label: "Back to Import Requests" },
  "maintenance": { href: "/maintenance", label: "Back to Maintenance Requests" },
  "purchase": { href: "/purchase", label: "Back to Purchase Requests" },
  "event": { href: "/event", label: "Back to Event Requests" },
  "travel": { href: "/travel", label: "Back to Travel Requests" },
  "hr": { href: "/hr", label: "Back to HR Requests" },
  "general": { href: "/general", label: "Back to General Requests" },
  "invoices": { href: "/departments/finance/invoices", label: "Back to Pre Paid Invoice Requests" },
  "reimbursement": { href: "/departments/finance/reimbursement", label: "Back to General Reimbursement Requests" },
  "travel-reimbursement": { href: "/departments/finance/travel-reimbursement", label: "Back to Travel Reimbursement Requests" },
  "sla-reminders": { href: "/departments/finance/sla-reminders", label: "Back to Finance SLA Reminders" },
  "departments/finance/all-requests": { href: "/departments/finance/all-requests", label: "Back to Finance Requests" },
  // Legacy source emitted before the Finance aggregate page had its own path.
  "departments/finance/reimbursement": { href: "/departments/finance/all-requests", label: "Back to Finance Requests" },
  "departments/hr/all-requests": { href: "/departments/hr/all-requests", label: "Back to People Requests" },
  "departments/hr/general": { href: "/departments/hr/general", label: "Back to People General Requests" },
  "departments/hr/letter": { href: "/departments/hr/letter", label: "Back to HR Letter Requests" },
}

/**
 * Resolve the request-detail return link without losing the portal that
 * opened the detail view. The pathname fallback also covers notifications and
 * dashboard links, which deliberately omit a source query parameter.
 */
export function getRequestBackDestination(pathname: string, source: string | null): RequestBackDestination {
  if (source && SOURCE_DESTINATIONS[source]) return SOURCE_DESTINATIONS[source]
  if (pathname.startsWith("/departments/finance/requests/")) {
    return { href: "/departments/finance/my-requests", label: "Back to Finance Requests" }
  }
  if (pathname.startsWith("/departments/hr/requests/")) {
    return { href: "/departments/hr/my-requests", label: "Back to People Requests" }
  }
  return { href: "/requests", label: "Back to Requests" }
}
