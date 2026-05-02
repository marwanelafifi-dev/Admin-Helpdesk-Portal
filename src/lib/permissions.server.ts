/* eslint-disable @typescript-eslint/no-explicit-any */
import { getPrisma } from "@/server/engine/prisma"

export type CustomPermission = { permission: string; allowed: boolean }

/** Server-only: check whether a user has a given permission using DB-backed RolePermission and customPermissions */
export async function hasPermission(userIdOrObject: string | { id?: string; role?: string; customPermissions?: unknown }, permission: string): Promise<boolean> {
  const prisma = getPrisma()

  let user: { id?: string; role?: string; customPermissions?: unknown } | null = null
  if (typeof userIdOrObject === "string") {
    user = await prisma.user.findUnique({
      where: { id: userIdOrObject },
      select: { id: true, role: true, customPermissions: true },
    })
  } else {
    user = userIdOrObject
  }

  if (!user) return false

  const cp = (user as any).customPermissions
  if (Array.isArray(cp)) {
    const match = cp.find((p: any) => p?.permission === permission)
    if (match) return !!match.allowed
  }

  if (!user.role) return false

  const rolePerm = await prisma.rolePermission.findFirst({ where: { role: user.role as any, permission } })
  if (rolePerm) return !!rolePerm.allowed

  return false
}

export async function setCustomPermissions(userId: string, perms: CustomPermission[]) {
  const prisma = getPrisma()
  return prisma.user.update({ where: { id: userId }, data: { customPermissions: perms as any } })
}

export async function addCustomPermission(userId: string, perm: CustomPermission) {
  const prisma = getPrisma()
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { customPermissions: true } })
  const cp = Array.isArray((u as any)?.customPermissions) ? (u as any).customPermissions : []
  const existingIndex = cp.findIndex((p: any) => p.permission === perm.permission)
  if (existingIndex !== -1) cp[existingIndex] = perm
  else cp.push(perm)
  return prisma.user.update({ where: { id: userId }, data: { customPermissions: cp as any } })
}

export async function removeCustomPermission(userId: string, permission: string) {
  const prisma = getPrisma()
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { customPermissions: true } })
  const cp = Array.isArray((u as any)?.customPermissions) ? (u as any).customPermissions : []
  const next = cp.filter((p: any) => p.permission !== permission)
  return prisma.user.update({ where: { id: userId }, data: { customPermissions: next as any } })
}

export default hasPermission
