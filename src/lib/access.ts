export type RoutePermission =
  | "page:dashboard"
  | "page:feedback-reports"
  | "page:tasks"
  | "page:all-requests"
  | "page:my-requests"
  | "page:request-detail"
  | "page:shipping"
  | "page:shipping-new"
  | "page:shipping-sending"
  | "page:shipping-receiving"
  | "page:hr"
  | "page:hr-new"
  | "page:maintenance"
  | "page:maintenance-new"
  | "page:purchase"
  | "page:purchase-new"
  | "page:event"
  | "page:travel"
  | "page:admin-users"
  | "page:admin-roles"
  | "page:admin-settings"
  | "page:admin-audit"
  | "page:admin-database"
  | "manage_users"
  | "manage_roles"
  | "manage_tasks"
  | "settings"
  | "update_status"
  | "cancel_request"
  | "edit_request"

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
  return role?.toLowerCase() === "super_admin"
}

export function permissionForPath(pathname: string): RoutePermission | null {
  const path = normalizePathname(pathname)

  if (path === "/dashboard") return "page:dashboard"
  if (path === "/feedback-reports") return "page:feedback-reports"
  if (path === "/tasks") return "page:tasks"
  if (path === "/admin/all-requests") return "page:all-requests"
  if (path === "/requests") return "page:my-requests"
  if (path.startsWith("/requests/")) return "page:request-detail"
  if (path === "/shipping") return "page:shipping"
  if (path === "/shipping/new") return "page:shipping-new"
  if (path === "/shipping/sending") return "page:shipping-sending"
  if (path === "/shipping/receiving") return "page:shipping-receiving"
  if (path === "/hr") return "page:hr"
  if (path === "/hr/new") return "page:hr-new"
  if (path === "/maintenance") return "page:maintenance"
  if (path === "/maintenance/new") return "page:maintenance-new"
  if (path === "/purchase") return "page:purchase"
  if (path === "/purchase/new") return "page:purchase-new"
  if (path === "/event") return "page:event"
  if (path === "/travel") return "page:travel"
  if (path === "/admin/users") return "page:admin-users"
  if (path === "/admin/roles") return "page:admin-roles"
  if (path === "/admin/settings") return "page:admin-settings"
  if (path === "/admin/audit-trail") return "page:admin-audit"
  if (path === "/admin/database") return "page:admin-database"

  return null
}

export function canManageUsers(role?: string, permissions: string[] = []) {
  return isSuperAdmin(role) || hasPermission(permissions, "manage_users")
}

export function canManageRoles(role?: string, permissions: string[] = []) {
  return isSuperAdmin(role) || hasPermission(permissions, "manage_roles")
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
