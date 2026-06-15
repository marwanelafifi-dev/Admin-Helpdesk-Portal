import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { canManageRoles } from "@/lib/access"
import { findRoleById, findRoleByName, updateRole, deleteRole } from "@/lib/rolesStore"
import { logServerAudit } from "@/lib/serverAuditLog"

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

  const before = findRoleById(id)!
  const updated = updateRole(id, {
    ...(parsed.data.name && { name: parsed.data.name }),
    ...(parsed.data.description !== undefined && { description: parsed.data.description || null }),
    ...(parsed.data.permissions !== undefined && { permissions: parsed.data.permissions }),
  })

  const changes: string[] = []
  if (parsed.data.name && parsed.data.name !== before.name) changes.push(`name: "${before.name}" → "${parsed.data.name}"`)
  if (parsed.data.permissions) {
    const added = parsed.data.permissions.filter((p) => !before.permissions.includes(p))
    const removed = before.permissions.filter((p) => !parsed.data.permissions!.includes(p))
    if (added.length > 0) changes.push(`+${added.length} permission(s) added`)
    if (removed.length > 0) changes.push(`−${removed.length} permission(s) removed`)
  }
  logServerAudit({
    actor: session?.user?.name ?? session?.user?.email ?? "Admin",
    actorEmail: session?.user?.email ?? "",
    action: "role_updated",
    targetId: id,
    targetTitle: before.name,
    details: changes.length > 0 ? changes.join("; ") : "Role updated",
    category: "role",
  })

  return NextResponse.json({ role: updated })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id } = await params

  if (!canManageRoles(session?.user?.role, session?.user?.permissions ?? [])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const roleToDelete = findRoleById(id)
  if (!deleteRole(id)) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 })
  }

  logServerAudit({
    actor: session?.user?.name ?? session?.user?.email ?? "Admin",
    actorEmail: session?.user?.email ?? "",
    action: "role_deleted",
    targetId: id,
    targetTitle: roleToDelete?.name ?? id,
    details: `Role deleted: "${roleToDelete?.name ?? id}"`,
    category: "role",
  })

  return NextResponse.json({ success: true })
}
