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
   * Optional group label — purely cosmetic, used by the Roles dialog to
   * organize checkboxes. Leave undefined to show under "General".
   */
  group?: string
}

export const PAGES: PageDefinition[] = [
  // Core / dashboard
  { id: "dashboard",          label: "Dashboard",            path: "/dashboard",                 group: "Core" },
  { id: "feedback-reports",   label: "Feedback & Reports",   path: "/feedback-reports",          group: "Core" },
  { id: "tasks",              label: "Team Tasks",           path: "/tasks",                     group: "Core" },
  { id: "my-requests",        label: "My Requests",          path: "/requests",                  group: "Core" },
  { id: "team-requests",      label: "Team Requests",        path: "/team-requests",             group: "Core" },
  { id: "request-detail",     label: "Request Detail",       path: "/requests/[id]",             group: "Core" },
  { id: "all-requests",       label: "All Requests",         path: "/admin/all-requests",        group: "Core" },

  // Modules
  { id: "shipping",           label: "Shipping",             path: "/shipping",                  group: "Modules" },
  { id: "shipping-new",       label: "Shipping New",         path: "/shipping/new",              group: "Modules" },
  { id: "shipping-sending",   label: "Shipping Sending",     path: "/shipping/sending",          group: "Modules" },
  { id: "shipping-receiving", label: "Shipping Receiving",   path: "/shipping/receiving",        group: "Modules" },
  { id: "hr",                 label: "HR",                   path: "/hr",                        group: "Modules" },
  { id: "hr-new",             label: "HR New",               path: "/hr/new",                    group: "Modules" },
  { id: "hr-onboarding",      label: "HR Onboarding",        path: "/hr/onboarding",             group: "Modules" },
  { id: "hr-offboarding",     label: "HR Offboarding",       path: "/hr/offboarding",            group: "Modules" },
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

  // Admin
  { id: "admin-users",         label: "Users (Admin)",         path: "/admin/users",          group: "Admin" },
  { id: "admin-roles",         label: "Roles (Admin)",         path: "/admin/roles",          group: "Admin" },
  { id: "admin-settings",      label: "Settings (Admin)",      path: "/admin/settings",       group: "Admin" },
  { id: "admin-notifications", label: "Notifications (Admin)", path: "/admin/notifications",  group: "Admin" },
  { id: "admin-announcements", label: "Announcements (Admin)", path: "/admin/announcements", group: "Admin" },
  { id: "admin-company-data",  label: "Company Data (Admin)",  path: "/admin/company-data",   group: "Admin" },
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
export function pagesByGroup(): Array<{ group: string; pages: PageDefinition[] }> {
  const groups: Record<string, PageDefinition[]> = {}
  for (const page of PAGES) {
    const g = page.group ?? "General"
    if (!groups[g]) groups[g] = []
    groups[g].push(page)
  }
  return Object.entries(groups).map(([group, pages]) => ({ group, pages }))
}
