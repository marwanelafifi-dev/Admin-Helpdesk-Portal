import { getCompanyFromEmail, getRequestCompany } from "@/lib/userCompany"
import { PAGES, pagePermission } from "@/lib/pageRegistry"

export type RoutePermission = string

function normalizePathname(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1)
  }
  return pathname
}

export function hasPermission(permissions: string[] | undefined, permission: string) {
  if (!permissions || permissions.length === 0) {
    return false
  }

  return permissions.includes("*") || permissions.includes(permission)
}

export function isSuperAdmin(role?: string) {
  return role === "Full Access" || role?.toLowerCase() === "super_admin"
}

export function permissionForPath(pathname: string): RoutePermission | null {
  const path = normalizePathname(pathname)

  // The role editor's page registry is the authority for exact routes and
  // dynamic detail pages. Prefer assignable pages when a legacy route shares
  // the same pattern with a retained, non-assignable entry.
  const routePattern = (route: string) => new RegExp(
    `^${route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\[id\\\]/g, "[^/]+")}$`
  )
  const registered = [...PAGES]
    .sort((a, b) => Number(b.assignable !== false) - Number(a.assignable !== false))
    .find((page) => routePattern(page.path).test(path))
  if (registered) return pagePermission(registered.id)

  // Module detail/action URLs intentionally inherit the access permission of
  // their parent page. These paths do not have an individual Roles checkbox.
  if (path.startsWith("/shipping/sending")) return "page:shipping-sending"
  if (path.startsWith("/shipping/receiving")) return "page:shipping-receiving"
  if (path.startsWith("/departments/finance/reimbursement")) return "page:finance-reimbursement"
  if (path.startsWith("/departments/finance/travel-reimbursement")) return "page:finance-travel"
  if (path.startsWith("/departments/finance/invoices")) return "page:finance-invoices"
  if (path.startsWith("/departments/hr/general")) return "page:hr-general"
  if (path.startsWith("/departments/hr/letter")) return "page:hr-letter-request"

  return null
}

export function canManageUsers(role?: string, permissions: string[] = []) {
  return isSuperAdmin(role) || hasPermission(permissions, "manage_users")
}

export function canManageRoles(role?: string, permissions: string[] = []) {
  return isSuperAdmin(role) || hasPermission(permissions, "manage_roles")
}

/**
 * Returns true when the current user is allowed to see EVERY request from
 * every requester (e.g. Administration Team, Full Access). When false, the
 * caller should filter the visible request list down to the current user's
 * own submissions only.
 */
export function canReadAllRequests(role?: string, permissions: string[] = []) {
  if (isSuperAdmin(role)) return true
  if (permissions.includes("*")) return true
  if (hasPermission(permissions, "read")) return true
  // `read_own` alone means scope-to-self.
  return false
}

/**
 * Filter a list of requests down to the ones the current user is allowed
 * to see. Anyone with read_all sees everything; otherwise only requests
 * where the user is the requester are returned.
 */
export function scopeRequests<T extends { requesterId?: string; requesterEmail?: string; requesterName?: string }>(
  requests: T[],
  session: { id?: string | null; email?: string | null; name?: string | null } | null | undefined,
  role?: string,
  permissions: string[] = [],
): T[] {
  if (canReadAllRequests(role, permissions)) return requests
  const myId = (session?.id ?? "").trim()
  const myEmail = (session?.email ?? "").trim().toLowerCase()
  const myName = (session?.name ?? "").trim()
  if (!myId && !myEmail && !myName) return []
  return requests.filter((r) => {
    if (myId && r.requesterId === myId) return true
    if (myEmail && (r.requesterEmail ?? "").toLowerCase() === myEmail) return true
    if (myName && (r.requesterName ?? "") === myName) return true
    return false
  })
}

export function canAccessPath(pathname: string, permissions: string[] = [], role?: string) {
  const path = normalizePathname(pathname)

  if (path === "/admin") {
    return false
  }

  if (isSuperAdmin(role) || permissions.includes("*")) {
    return true
  }

  const permission = permissionForPath(path)

  if (!permission) {
    return true
  }

  return hasPermission(permissions, permission)
}

const defaultRouteOrder = [
  "/dashboard",
  "/feedback-reports",
  "/tasks",
  "/announcements",
  "/admin/all-requests",
  "/requests",
  "/shipping",
  "/shipping/new",
  "/shipping/sending",
  "/shipping/receiving",
  "/hr",
  "/hr/new",
  "/maintenance",
  "/maintenance/new",
  "/purchase",
  "/purchase/new",
  "/event",
  "/travel",
  "/admin/users",
  "/admin/roles",
  "/admin/settings",
]

export function getFirstAllowedPath(permissions: string[] = [], role?: string) {
  return defaultRouteOrder.find((path) => canAccessPath(path, permissions, role)) ?? "/unauthorized"
}

// ─── Global/Platform Admin Panel ───────────────────────────────────────────
// Platform-wide superadmin tools, intentionally decoupled from any single
// business function's portal (Administration Team, People Team, Finance Team).
// Reachable from any portal via the TopBar icon or the /landing tile —
// see PLATFORM_ADMIN_PATHS below and src/app/(platform-admin)/layout.tsx.

const PLATFORM_ADMIN_PATHS = [
  "/admin/users",
  "/admin/roles",
  "/admin/roles/buchi",
  "/admin/settings",
  "/admin/notifications",
  "/admin/portal-updates",
  "/admin/portal-feedback",
  "/admin/company-data",
  "/admin/company-data/buchi",
  "/admin/audit-trail",
  "/admin/database",
]

/** First platform-admin page this user can open, or null if they have none of these permissions. */
export function getFirstAllowedPlatformAdminPath(permissions: string[] = [], role?: string): string | null {
  return PLATFORM_ADMIN_PATHS.find((path) => canAccessPath(path, permissions, role)) ?? null
}

/** True if this user can reach any platform-admin page — drives visibility of the TopBar icon and /landing tile. */
export function hasPlatformAdminAccess(permissions: string[] = [], role?: string): boolean {
  return getFirstAllowedPlatformAdminPath(permissions, role) !== null
}

// ─── Module-Level Access Control ───────────────────────────────────────────

export type RequestModule = "shipping" | "maintenance" | "purchase" | "event" | "travel" | "hr" | "general" | "finance_reimbursement" | "finance_travel_reimbursement" | "finance_invoice_payment" | "hr_general" | "hr_letter"

export const ALL_MODULES: RequestModule[] = ["shipping", "maintenance", "purchase", "event", "travel", "hr", "general", "finance_reimbursement", "finance_travel_reimbursement", "finance_invoice_payment", "hr_general", "hr_letter"]

export interface UserWithModuleAccess {
  id?: string
  email?: string
  name?: string
  role?: string
  readModules?: RequestModule[]
  readAllModules?: RequestModule[]
}

/**
 * Check if user can access a specific module page
 */
export function canAccessModule(user: UserWithModuleAccess | null | undefined, module: RequestModule): boolean {
  if (!user) return false
  if (isSuperAdmin(user.role)) return true
  if (!user.readModules || user.readModules.length === 0) return false
  return user.readModules.includes(module)
}

/**
 * Check if user can see ALL requests in a module (vs only their own)
 */
export function canReadAllInModule(user: UserWithModuleAccess | null | undefined, module: RequestModule): boolean {
  if (!user) return false
  if (isSuperAdmin(user.role)) return true
  if (!user.readAllModules || user.readAllModules.length === 0) return false
  return user.readAllModules.includes(module)
}

/**
 * Get list of modules this user has access to
 */
export function getAccessibleModules(user: UserWithModuleAccess | null | undefined): RequestModule[] {
  if (!user) return []
  if (isSuperAdmin(user.role)) return ALL_MODULES
  return user.readModules ?? []
}

/**
 * Filter requests by module access - user can only see requests from modules
 * they have access to, and only see all requests from modules in readAllModules
 */
export function scopeRequestsByModuleAccess<T extends { module?: string; requesterId?: string; requesterEmail?: string; requesterName?: string; companyId?: string; companyName?: string }>(
  requests: T[],
  user: UserWithModuleAccess | null | undefined,
  userSession: { id?: string | null; email?: string | null } | null | undefined = null,
): T[] {
  if (!user) return []
  if (isSuperAdmin(user.role)) return requests

  // A BUCHI-owned role may read all requests in a selected module, but only
  // within BUCHI. This company boundary is applied before module/read scope
  // so "View ALL HR Requests" never exposes Si-Ware HR records.
  const isBuchiUser = user.role?.toLowerCase().includes("buchi")
    || getCompanyFromEmail(user.email)?.id === "buchi"

  return requests.filter((req) => {
    const module = req.module as RequestModule | undefined
    if (!module) return false

    if (isBuchiUser) {
      const requestCompany = req.companyId ?? getRequestCompany(module, req.requesterEmail)?.id
      if (requestCompany !== "buchi") return false
    }

    // Must have access to this module
    if (!canAccessModule(user, module)) return false

    // If can read all in this module, show it
    if (canReadAllInModule(user, module)) return true

    // Otherwise, only show their own requests
    const myId = (userSession?.id ?? "").trim()
    const myEmail = (userSession?.email ?? "").trim().toLowerCase()
    if (myId && req.requesterId === myId) return true
    if (myEmail && (req.requesterEmail ?? "").trim().toLowerCase() === myEmail) return true

    return false
  })
}
