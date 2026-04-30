import { prisma } from "@/lib/prisma"

export const DEFAULT_USER_ROLES = ["super_admin", "admin", "manager", "requester", "viewer"] as const

const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ["*"],
  admin: [
    "page:dashboard",
    "page:all-requests",
    "page:my-requests",
    "page:request-detail",
    "page:shipping",
    "page:shipping-new",
    "page:shipping-sending",
    "page:shipping-receiving",
    "page:hr",
    "page:hr-new",
    "page:maintenance",
    "page:maintenance-new",
    "page:purchase",
    "page:purchase-new",
    "page:event",
    "page:travel",
    "page:admin-users",
    "page:admin-settings",
    "manage_users",
  ],
  manager: [
    "page:dashboard",
    "page:all-requests",
    "page:my-requests",
    "page:request-detail",
    "page:shipping",
    "page:shipping-new",
    "page:shipping-sending",
    "page:shipping-receiving",
    "page:hr",
    "page:hr-new",
    "page:maintenance",
    "page:maintenance-new",
    "page:purchase",
    "page:purchase-new",
    "page:event",
    "page:travel",
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
  const normalized = role?.toLowerCase()
  return normalized === "super_admin" || normalized === "admin"
}

function toLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export async function getAssignableRoles(): Promise<UserRoleOption[]> {
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
  if (!role) {
    return []
  }

  const roleRecord = await prisma.role.findFirst({
    where: {
      name: {
        equals: role,
        mode: "insensitive",
      },
    },
    select: {
      permissions: true,
    },
  })

  if (roleRecord) {
    return roleRecord.permissions
  }

  return DEFAULT_ROLE_PERMISSIONS[role.toLowerCase()] ?? []
}
