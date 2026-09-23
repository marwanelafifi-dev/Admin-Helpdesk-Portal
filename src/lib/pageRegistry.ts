/**
 * Canonical registry of every protected page in the app.
 *
 * Why this file exists:
 * - The Admin > Roles dialog renders one checkbox per page from this list.
 *   Adding a new page here makes it automatically appear in the dialog —
 *   no need to edit roles/page.tsx.
 * - middleware.ts reads from this list to gate routes by `page:*` permission.
 * - Single source of truth: "is route X gated, and what permission does it need?"
 *
 * To add a new page:
 *   1. Append an entry to PAGES below.
 *   2. Grant the new `page:<id>` permission to whichever roles should see it
 *      (in `data/roles.json` and/or via the Admin > Roles UI).
 *   3. Done. The page checkbox appears in the Roles dialog automatically and
 *      middleware enforces the permission.
 */

export interface PageDefinition {
  /** Unique short id. Used to compose the permission string (`page:<id>`). */
  id: string
  /** Human-readable label shown in the Roles dialog. */
  label: string
  /** Route path used by middleware to match the incoming request. */
  path: string
  /**
   * False keeps a retained legacy route protected, but removes it from the
   * normal Roles editor so it cannot be assigned to new function roles.
   */
  assignable?: boolean
  /**
   * Optional group label — purely cosmetic, used by the Roles dialog to
   * organize checkboxes. Leave undefined to show under "General".
   */
  group?: string
}

export const PAGES: PageDefinition[] = [
  // Administration function / work queue
  { id: "dashboard",          label: "Administration Dashboard", path: "/dashboard",                group: "Administration Function" },
  { id: "admin-services",     label: "Administration Services", path: "/departments/admin",          group: "Administration Function" },
  { id: "feedback-reports",   label: "Administration Feedback & Reports", path: "/feedback-reports", group: "Administration Function" },
  { id: "tasks",              label: "Administration Team Tasks", path: "/tasks",                    group: "Administration Function" },
  { id: "announcements",      label: "Administration Announcements", path: "/announcements",          group: "Administration Function" },
  { id: "system-notices",     label: "Administration System Notices", path: "/system/notices",        group: "Administration Function" },
  { id: "my-requests",        label: "Administration My Requests", path: "/requests",                 group: "Administration Function" },
  { id: "team-requests",      label: "Administration Team Requests", path: "/team-requests",          group: "Administration Function" },
  { id: "request-detail",     label: "Administration Request Detail", path: "/requests/[id]",          group: "Administration Function" },
  { id: "all-requests",       label: "Administration All Requests", path: "/admin/all-requests", group: "Administration Function" },

  // Administration service modules
  { id: "shipping",           label: "Shipping",             path: "/shipping",                  group: "Modules" },
  { id: "shipping-new",       label: "Shipping New",         path: "/shipping/new",              group: "Modules" },
  { id: "shipping-sending",   label: "Shipping Export",      path: "/shipping/sending",          group: "Modules" },
  { id: "shipping-receiving", label: "Shipping Import",      path: "/shipping/receiving",        group: "Modules" },
  { id: "hr",                 label: "HR",                   path: "/hr",                        group: "Modules" },
  { id: "hr-new",             label: "HR New",               path: "/hr/new",                    group: "Modules" },
  { id: "hr-onboarding",      label: "HR Onboarding",        path: "/hr/onboarding",             group: "Modules" },
  { id: "hr-offboarding",     label: "HR Offboarding",       path: "/hr/offboarding",            group: "Modules" },
  // Retained only for legacy links. New People roles use the People portal's
  // "HR Letter Request" and "People Request Detail" permissions instead.
  { id: "hr-letter",          label: "HR Letter",            path: "/hr/letter",                 group: "Modules", assignable: false },
  { id: "hr-travel-letter",   label: "HR Travel Letter",     path: "/departments/hr/requests/[id]", group: "Modules", assignable: false },
  { id: "maintenance",        label: "Maintenance",          path: "/maintenance",               group: "Modules" },
  { id: "maintenance-new",    label: "Maintenance New",      path: "/maintenance/new",           group: "Modules" },
  { id: "purchase",           label: "Purchase",             path: "/purchase",                  group: "Modules" },
  { id: "purchase-new",       label: "Purchase New",         path: "/purchase/new",              group: "Modules" },
  { id: "event",              label: "Event",                path: "/event",                     group: "Modules" },
  { id: "event-new",          label: "Event New",            path: "/event/new",                 group: "Modules" },
  { id: "travel",             label: "Travel",               path: "/travel",                    group: "Modules" },
  { id: "travel-new",         label: "Travel New",           path: "/travel/new",                group: "Modules" },
  { id: "general",            label: "General Request",      path: "/general",                   group: "Modules" },
  { id: "general-new",        label: "General Request New",  path: "/general/new",               group: "Modules" },

  // Function portals — these are separate shells with their own dashboards,
  // work queues, and requester pages.
  { id: "finance-dashboard",  label: "Finance Dashboard",    path: "/departments/finance",                         group: "Finance" },
  { id: "finance-services",   label: "Finance Services",     path: "/departments/finance/services",                group: "Finance" },
  { id: "finance-reimbursement", label: "General Reimbursement", path: "/departments/finance/reimbursement",          group: "Finance" },
  { id: "finance-travel",     label: "Travel Reimbursement", path: "/departments/finance/travel-reimbursement",      group: "Finance" },
  { id: "finance-invoices",   label: "Invoices Payment",     path: "/departments/finance/invoices",                group: "Finance" },
  { id: "finance-my-requests", label: "Finance My Requests", path: "/departments/finance/my-requests",              group: "Finance" },
  { id: "finance-team-requests", label: "Finance Team Requests", path: "/departments/finance/team-requests",        group: "Finance" },
  { id: "finance-all-requests", label: "Finance All Requests", path: "/departments/finance/all-requests",           group: "Finance" },
  { id: "finance-tasks",      label: "Finance Team Tasks",   path: "/departments/finance/tasks",                   group: "Finance" },
  { id: "finance-sla-reminders", label: "Finance SLA Reminders", path: "/departments/finance/sla-reminders",         group: "Finance" },
  { id: "finance-feedback",   label: "Finance Feedback & Reports", path: "/departments/finance/feedback",           group: "Finance" },
  { id: "finance-request-detail", label: "Finance Request Detail", path: "/departments/finance/requests/[id]",       group: "Finance" },
  { id: "hr-dashboard",       label: "People Dashboard",     path: "/departments/hr",                              group: "People" },
  { id: "hr-services",        label: "People Services",      path: "/departments/hr/services",                     group: "People" },
  { id: "hr-general",         label: "People General Request", path: "/departments/hr/general",                     group: "People" },
  { id: "hr-letter-request",  label: "HR Letter Request",    path: "/departments/hr/letter",                       group: "People" },
  { id: "hr-my-requests",     label: "People My Requests",   path: "/departments/hr/my-requests",                  group: "People" },
  { id: "hr-team-requests",   label: "People Team Requests", path: "/departments/hr/team-requests",                group: "People" },
  { id: "hr-all-requests",    label: "People All Requests",  path: "/departments/hr/all-requests",                 group: "People" },
  { id: "hr-tasks",           label: "People Team Tasks",    path: "/departments/hr/tasks",                        group: "People" },
  { id: "hr-feedback",        label: "People Feedback & Reports", path: "/departments/hr/feedback",                  group: "People" },
  { id: "hr-request-detail",  label: "People Request Detail", path: "/departments/hr/requests/[id]",                group: "People" },

  // IT is an external SolarWinds Service Desk integration. The permission
  // controls visibility of its landing-card entry rather than an app route.
  { id: "it-services",         label: "IT Team Services", path: "/departments/it",                                  group: "IT" },

  // Admin
  { id: "admin-users",         label: "Users (Admin)",         path: "/admin/users",          group: "Admin" },
  { id: "admin-roles",         label: "Roles - Si-Ware Systems (Admin)", path: "/admin/roles", group: "Admin" },
  { id: "admin-roles-buchi",   label: "Roles - BUCHI (Admin)", path: "/admin/roles/buchi", group: "Admin" },
  { id: "admin-settings",      label: "Settings (Admin)",      path: "/admin/settings",       group: "Admin" },
  { id: "admin-notifications", label: "Notifications (Admin)", path: "/admin/notifications",  group: "Admin" },
  { id: "admin-announcements", label: "Send Announcements",    path: "/admin/announcements", group: "Core" },
  { id: "admin-company-data",  label: "Company Data - Si-Ware (Admin)", path: "/admin/company-data", group: "Admin" },
  { id: "admin-company-data-buchi", label: "Company Data - BUCHI (Admin)", path: "/admin/company-data/buchi", group: "Admin" },
  { id: "admin-audit",         label: "Audit Trail (Admin)",   path: "/admin/audit-trail",    group: "Admin" },
  { id: "admin-database",      label: "Database (Admin)",      path: "/admin/database",       group: "Admin" },

]

/** The permission string for a given page id, e.g. "dashboard" -> "page:dashboard". */
export function pagePermission(id: string): string {
  return `page:${id}`
}

/** Route path -> required permission, used by middleware. */
export const PAGE_PERMISSIONS_BY_PATH: Record<string, string> = Object.fromEntries(
  PAGES.map((p) => [p.path, pagePermission(p.id)])
)

/** Group label -> pages in that group, for the Roles UI to render. */
export function pagesByGroup(includeNonAssignable = false): Array<{ group: string; pages: PageDefinition[] }> {
  const groups: Record<string, PageDefinition[]> = {}
  for (const page of PAGES) {
    if (!includeNonAssignable && page.assignable === false) continue
    const rawGroup = page.group ?? "General"
    // Administration's legacy dashboard and module pages used separate
    // registry group names. They are one function in the role editor, just
    // as Finance and People each render as one section.
    const g = rawGroup === "Administration Function" || rawGroup === "Modules" || rawGroup === "Core"
      ? "Administration"
      : rawGroup
    if (!groups[g]) groups[g] = []
    groups[g].push(page)
  }
  // These labels appear only in the role editor. Keep the legacy registry
  // values stable while making the platform-only controls unambiguous.
  const editorGroupLabels: Record<string, string> = {
    Admin: "Platform Administration",
  }
  const administrationPageOrder = [
    "dashboard",
    "admin-services",
    "shipping", "shipping-new", "shipping-sending", "shipping-receiving",
    "hr", "hr-new", "hr-onboarding", "hr-offboarding",
    "maintenance", "maintenance-new", "purchase", "purchase-new",
    "event", "event-new", "travel", "travel-new", "general", "general-new",
    "my-requests", "team-requests", "all-requests", "tasks", "feedback-reports",
    "announcements", "system-notices", "admin-announcements", "request-detail",
  ]
  return Object.entries(groups).map(([group, pages]) => ({
    group: editorGroupLabels[group] ?? group,
    // Match the Finance and People sequence: dashboard, service pages, then
    // requester/team queues and supporting pages.
    pages: group === "Administration"
      ? [...pages].sort((a, b) => administrationPageOrder.indexOf(a.id) - administrationPageOrder.indexOf(b.id))
      : pages,
  }))
}
