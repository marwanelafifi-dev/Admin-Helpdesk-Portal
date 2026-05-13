import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { canManageRoles } from "@/lib/access"
import { findRoleById, findRoleByName, updateRole, deleteRole } from "@/lib/rolesStore"

const updateRoleSchema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  description: z.string().trim().optional(),
  permissions: z.array(z.string()).optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id } = await params

  if (!canManageRoles(session?.user?.role, session?.user?.permissions ?? [])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const payload = await request.json()
  const parsed = updateRoleSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid role data", issues: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  if (!findRoleById(id)) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 })
  }

  if (parsed.data.name) {
    const existing = findRoleByName(parsed.data.name)
    if (existing && existing.id !== id) {
      return NextResponse.json({ error: "Role name already in use" }, { status: 409 })
    }
  }

  const updated = updateRole(id, {
    ...(parsed.data.name && { name: parsed.data.name }),
    ...(parsed.data.description !== undefined && { description: parsed.data.description || null }),
    ...(parsed.data.permissions !== undefined && { permissions: parsed.data.permissions }),
  })

  return NextResponse.json({ role: updated })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id } = await params

  if (!canManageRoles(session?.user?.role, session?.user?.permissions ?? [])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (!deleteRole(id)) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
