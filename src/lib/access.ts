export type RoutePermission =
  | "page:dashboard"
  | "page:feedback-reports"
  | "page:tasks"
  | "page:all-requests"
  | "page:my-requests"
  | "page:team-requests"
  | "page:request-detail"
  | "page:shipping"
  | "page:shipping-new"
  | "page:shipping-sending"
  | "page:shipping-receiving"
  | "page:hr"
  | "page:hr-new"
  | "page:hr-onboarding"
  | "page:hr-offboarding"
  | "page:maintenance"
  | "page:maintenance-new"
  | "page:purchase"
  | "page:purchase-new"
  | "page:event"
  | "page:event-new"
  | "page:travel"
  | "page:travel-new"
  | "page:general"
  | "page:general-new"
  | "page:admin-users"
  | "page:admin-roles"
  | "page:admin-settings"
  | "page:admin-audit"
  | "page:admin-database"
  | "page:admin-notifications"
  | "page:admin-company-data"
  | "manage_users"
  | "manage_roles"
  | "manage_tasks"
  | "settings"
  | "update_status"
  | "cancel_request"
  | "edit_request"
  | "assign_requests"

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

  if (path === "/dashboard") return "page:dashboard"
  if (path === "/feedback-reports") return "page:feedback-reports"
  if (path === "/tasks") return "page:tasks"
  if (path === "/admin/all-requests") return "page:all-requests"
  if (path === "/requests") return "page:my-requests"
  if (path === "/team-requests") return "page:team-requests"
  if (path.startsWith("/requests/")) return "page:request-detail"
  if (path === "/shipping") return "page:shipping"
  if (path === "/shipping/new") return "page:shipping-new"
  if (path === "/shipping/sending") return "page:shipping-sending"
  if (path === "/shipping/receiving") return "page:shipping-receiving"
  if (path === "/hr") return "page:hr"
  if (path === "/hr/new") return "page:hr-new"
  if (path === "/hr/onboarding") return "page:hr-onboarding"
  if (path === "/hr/offboarding") return "page:hr-offboarding"
  if (path === "/maintenance") return "page:maintenance"
  if (path === "/maintenance/new") return "page:maintenance-new"
  if (path === "/purchase") return "page:purchase"
  if (path === "/purchase/new") return "page:purchase-new"
  if (path === "/event") return "page:event"
  if (path === "/event/new") return "page:event-new"
  if (path === "/travel") return "page:travel"
  if (path === "/travel/new") return "page:travel-new"
  if (path === "/general") return "page:general"
  if (path === "/general/new") return "page:general-new"
  if (path === "/admin/users") return "page:admin-users"
  if (path === "/admin/roles") return "page:admin-roles"
  if (path === "/admin/settings") return "page:admin-settings"
  if (path === "/admin/audit-trail") return "page:admin-audit"
  if (path === "/admin/database") return "page:admin-database"
  if (path === "/admin/notifications") return "page:admin-notifications"
  if (path === "/admin/company-data") return "page:admin-company-data"

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

  if (hasPermission(permissions, permission)) {
    return true
  }

  if (permission === "page:admin-users") {
    return hasPermission(permissions, "manage_users")
  }

  if (permission === "page:admin-roles") {
    return hasPermission(permissions, "manage_roles")
  }

  if (permission === "page:admin-settings") {
    return hasPermission(permissions, "settings")
  }

  if (permission === "page:admin-audit") {
    return isSuperAdmin(role) || hasPermission(permissions, "manage_users")
  }

  if (permission === "page:admin-database") {
    return isSuperAdmin(role) || hasPermission(permissions, "settings")
  }

  if (permission === "page:admin-notifications") {
    return isSuperAdmin(role) || hasPermission(permissions, "settings")
  }

  if (permission === "page:admin-company-data") {
    return isSuperAdmin(role) || hasPermission(permissions, "settings")
  }

  return false
}

const defaultRouteOrder = [
  "/dashboard",
  "/feedback-reports",
  "/tasks",
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
