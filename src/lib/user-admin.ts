import type { UserRole } from "@prisma/client"
import { getPrisma } from "@/server/engine/prisma"

export const VALID_USER_ROLES = [
  "super_admin",
  "admin",
  "manager",
  "employee",
  "external",
] as const satisfies readonly UserRole[]

export function isValidUserRole(value: string): value is UserRole {
  return VALID_USER_ROLES.includes(value as UserRole)
}

export async function updateUserRole(userId: string, newRoleId: UserRole) {
  const prisma = getPrisma()

  return prisma.user.update({
    where: { id: userId },
    data: {
      role: newRoleId,
      sessionVersion: {
        increment: 1,
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      sessionVersion: true,
      createdAt: true,
      emailVerified: true,
    },
  })
}
