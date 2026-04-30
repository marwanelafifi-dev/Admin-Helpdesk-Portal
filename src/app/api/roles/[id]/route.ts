import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

const AVAILABLE_PERMISSIONS = [
  "create",
  "read",
  "read_own",
  "update",
  "delete",
  "approve",
  "reject",
  "manage_users",
  "manage_roles",
  "settings",
] as const

const updateRoleSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(50).optional(),
  description: z.string().trim().optional(),
  permissions: z.array(z.enum(AVAILABLE_PERMISSIONS)).optional(),
})

function canManageRoles(role?: string) {
  return role === "super_admin"
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id } = await params

  if (!canManageRoles(session?.user?.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const payload = await request.json()
  const parsed = updateRoleSchema.safeParse(payload)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid role data", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const role = await prisma.role.findUnique({ where: { id } })
  if (!role) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 })
  }

  const updateData: any = {}

  if (parsed.data.name) {
    const existingRole = await prisma.role.findUnique({
      where: { name: parsed.data.name },
    })
    if (existingRole && existingRole.id !== id) {
      return NextResponse.json({ error: "Role name already in use" }, { status: 409 })
    }
    updateData.name = parsed.data.name
  }

  if (parsed.data.description !== undefined) {
    updateData.description = parsed.data.description || null
  }

  if (parsed.data.permissions !== undefined) {
    updateData.permissions = parsed.data.permissions
  }

  const updated = await prisma.role.update({
    where: { id },
    data: updateData,
  })

  return NextResponse.json({ role: updated })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id } = await params

  if (!canManageRoles(session?.user?.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const role = await prisma.role.findUnique({ where: { id } })
  if (!role) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 })
  }

  await prisma.role.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
