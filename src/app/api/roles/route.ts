import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { canManageRoles } from "@/lib/access"
import { readRoles, findRoleByName, createRole } from "@/lib/rolesStore"

const createRoleSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(50),
  description: z.string().trim().optional(),
  permissions: z.array(z.string()).default([]),
})

export async function GET() {
  const session = await auth()
  if (!canManageRoles(session?.user?.role, session?.user?.permissions ?? [])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  return NextResponse.json({ roles: readRoles() })
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
  })

  return NextResponse.json({ role }, { status: 201 })
}
