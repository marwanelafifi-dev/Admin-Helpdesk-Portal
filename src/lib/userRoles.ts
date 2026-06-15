import { prisma } from "@/lib/prisma"

export const DEFAULT_USER_ROLES = ["Full Access", "admin", "manager", "requester", "viewer"] as const

const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  "Full Access": ["*"],
  admin: [
    "page:dashboard",
    "page:feedback-reports",
    "page:tasks",
    "page:all-requests",
    "page:my-requests",
    "page:request-detail",
    "page:shipping",
    "page:shipping-new",
    "page:shipping-sending",
    "page:shipping-receiving",
    "page:hr",
    "page:hr-new",
    "page:hr-onboarding",
    "page:hr-offboarding",
    "page:maintenance",
    "page:maintenance-new",
    "page:purchase",
    "page:purchase-new",
    "page:event",
    "page:travel",
    "page:admin-users",
    "page:admin-settings",
    "manage_users",
    "manage_tasks",
    "update_status",
    "cancel_request",
    "edit_request",
  ],
  manager: [
    "page:dashboard",
    "page:feedback-reports",
    "page:tasks",
    "page:all-requests",
    "page:my-requests",
    "page:request-detail",
    "page:shipping",
    "page:shipping-new",
    "page:shipping-sending",
    "page:shipping-receiving",
    "page:hr",
    "page:hr-new",
    "page:hr-onboarding",
    "page:hr-offboarding",
    "page:maintenance",
    "page:maintenance-new",
    "page:purchase",
    "page:purchase-new",
    "page:event",
    "page:travel",
    "manage_tasks",
    "update_status",
    "cancel_request",
    "edit_request",
  ],
  requester: [
    "page:dashboard",
    "page:my-requests",
    "page:request-detail",
    "page:shipping",
    "page:shipping-receiving",
    "page:purchase",
    "page:purchase-new",
    "page:travel",
  ],
  viewer: ["page:dashboard", "page:my-requests", "page:request-detail"],
}

export type UserRoleOption = {
  value: string
  label: string
  description: string | null
}

export function canManageUsers(role?: string) {
  return role === "Full Access" || role === "Administration Team" || role?.toLowerCase() === "admin"
}

function toLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export async function getAssignableRoles(): Promise<UserRoleOption[]> {
  try {
    const roles = await prisma.role.findMany({
      orderBy: { createdAt: "desc" },
      select: { name: true, description: true },
    })

    if (roles.length > 0) {
      return roles.map((role) => ({
        value: role.name,
        label: role.name,
        description: role.description ?? null,
      }))
    }
  } catch {
    // DB unavailable — fall through to defaults
  }

  return DEFAULT_USER_ROLES.map((role) => ({
    value: role,
    label: toLabel(role),
    description: null,
  }))
}

export function isAllowedRole(role: string, roles: UserRoleOption[]) {
  return roles.some((item) => item.value === role)
}

export async function getPermissionsForRole(role?: string): Promise<string[]> {
  if (!role) return []

  try {
    const { findRoleByName } = await import("@/lib/rolesStore")
    const stored = findRoleByName(role)
    if (stored) return stored.permissions
  } catch {
    // fall through to defaults
  }

  return DEFAULT_ROLE_PERMISSIONS[role.toLowerCase()] ?? []
}
