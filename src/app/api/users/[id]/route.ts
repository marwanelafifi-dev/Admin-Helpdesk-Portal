import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

const roles = ["super_admin", "admin", "manager", "requester", "viewer"] as const

const updateUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required").optional(),
  email: z.string().trim().email("Valid email is required").optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  role: z.enum(roles).optional(),
  department: z.string().trim().optional(),
  active: z.boolean().optional(),
})

function canManageUsers(role?: string) {
  return role === "super_admin" || role === "admin"
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id } = await params

  if (!canManageUsers(session?.user?.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const payload = await request.json()
  const parsed = updateUserSchema.safeParse(payload)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid user data", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const updateData: any = {}

  if (parsed.data.name) updateData.name = parsed.data.name
  if (parsed.data.email) {
    const existingUser = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
    })
    if (existingUser && existingUser.id !== id) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 })
    }
    updateData.email = parsed.data.email.toLowerCase()
  }
  if (parsed.data.password) {
    updateData.passwordHash = await bcrypt.hash(parsed.data.password, 12)
  }
  if (parsed.data.role) updateData.role = parsed.data.role
  if (parsed.data.department !== undefined) updateData.department = parsed.data.department || null
  if (parsed.data.active !== undefined) updateData.active = parsed.data.active

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      department: true,
      active: true,
      createdAt: true,
      image: true,
    },
  })

  return NextResponse.json({ user: updated })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id } = await params

  if (!canManageUsers(session?.user?.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  await prisma.user.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
