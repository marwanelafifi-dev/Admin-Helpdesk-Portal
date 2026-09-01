import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { canManageRoles } from "@/lib/access"
import { readRoles, findRoleByName, createRole } from "@/lib/rolesStore"
import { logServerAudit } from "@/lib/serverAuditLog"
import type { CompanyId } from "@/lib/userCompany"

const createRoleSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(50),
  description: z.string().trim().optional(),
  permissions: z.array(z.string()).default([]),
  readModules: z.array(z.string()).optional(),
  readAllModules: z.array(z.string()).optional(),
  companyId: z.enum(["si_ware", "buchi"]).default("si_ware"),
})

export async function GET(request: Request) {
  const session = await auth()
  if (!canManageRoles(session?.user?.role, session?.user?.permissions ?? [])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const requestedCompany = new URL(request.url).searchParams.get("company")
  if (requestedCompany !== "si_ware" && requestedCompany !== "buchi") {
    return NextResponse.json({ roles: readRoles() })
  }
  const company: CompanyId = requestedCompany
  return NextResponse.json({ roles: readRoles().filter((role) => (role.companyId ?? "si_ware") === company) })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!canManageRoles(session?.user?.role, session?.user?.permissions ?? [])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const payload = await request.json()
  const parsed = createRoleSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid role data", issues: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  if (findRoleByName(parsed.data.name)) {
    return NextResponse.json({ error: "A role with this name already exists" }, { status: 409 })
  }

  const role = createRole({
    name: parsed.data.name,
    description: parsed.data.description || null,
    permissions: parsed.data.permissions,
    readModules: parsed.data.readModules,
    readAllModules: parsed.data.readAllModules,
    companyId: parsed.data.companyId,
  })

  logServerAudit({
    actor: session?.user?.name ?? session?.user?.email ?? "Admin",
    actorEmail: session?.user?.email ?? "",
    action: "role_created",
    targetId: role.id,
    targetTitle: role.name,
    details: `New role created: "${role.name}" with ${role.permissions.length} permissions`,
    category: "role",
  })

  return NextResponse.json({ role }, { status: 201 })
}
