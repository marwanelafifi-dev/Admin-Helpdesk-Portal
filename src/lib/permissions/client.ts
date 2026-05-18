export type AppRole = "super_admin" | "admin" | "manager" | "employee" | "external"

export const PERMISSIONS = {
  dashboard:      ["super_admin", "admin", "manager"],
  allRequests:    ["super_admin", "admin", "manager"],
  analytics:      ["super_admin", "admin", "manager"],
  hrModule:       ["super_admin", "admin", "manager"],
  hrCreate:       ["super_admin", "manager"],
  adminPanel:     ["super_admin", "manager"],
  updateRequests: ["super_admin", "admin", "manager"],
  deleteRequests: ["super_admin", "admin"],
} as const

export function can(role: string | undefined, perm: keyof typeof PERMISSIONS): boolean {
  if (!role) return false
  const allowedRoles = PERMISSIONS[perm]
  return !!allowedRoles && (allowedRoles as readonly string[]).includes(role)
}

export function isRestricted(role: string | undefined): boolean {
  return role === "employee" || role === "external"
}
