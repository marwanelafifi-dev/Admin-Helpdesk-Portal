import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { canManageRoles } from "@/lib/access"

const createRoleSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(50),
  description: z.string().trim().optional(),
  permissions: z.array(z.string()).default([]),
})

export async function GET() {
  try {
    const session = await auth()

    if (!canManageRoles(session?.user?.role, session?.user?.permissions ?? [])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const roles = await prisma.role.findMany({
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ roles })
  } catch (error) {
    console.error("Role GET error:", error)
    return NextResponse.json(
      { error: "Failed to fetch roles", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!canManageRoles(session?.user?.role, session?.user?.permissions ?? [])) {
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
  } catch (error) {
    console.error("Role creation error:", error)
    return NextResponse.json(
      { error: "Failed to create role", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
