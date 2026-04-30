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

const createRoleSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(50),
  description: z.string().trim().optional(),
  permissions: z.array(z.string()).default([]),
})

function canManageRoles(role?: string) {
  return role === "super_admin"
}

export async function GET() {
  const session = await auth()

  if (!canManageRoles(session?.user?.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const roles = await prisma.role.findMany({
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ roles })
}

export async function POST(request: Request) {
  const session = await auth()

  if (!canManageRoles(session?.user?.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const payload = await request.json()
  const parsed = createRoleSchema.safeParse(payload)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid role data", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const existingRole = await prisma.role.findUnique({
    where: { name: parsed.data.name },
  })

  if (existingRole) {
    return NextResponse.json({ error: "A role with this name already exists" }, { status: 409 })
  }

  const role = await prisma.role.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      permissions: parsed.data.permissions,
    },
  })

  return NextResponse.json({ role }, { status: 201 })
}
