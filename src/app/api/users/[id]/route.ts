import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { canManageUsers } from "@/lib/access"
import { findUserById, updateUser, deleteUser } from "@/lib/userStore"

const updateUserSchema = z.object({
  name: z.string().trim().min(1).optional(),
  email: z.string().trim().email().optional(),
  role: z.string().trim().min(1).optional(),
  department: z.string().trim().optional(),
  active: z.boolean().optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id } = await params

  if (!canManageUsers(session?.user?.role, session?.user?.permissions ?? [])) {
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

  const user = findUserById(id)
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const updated = updateUser(id, {
    ...(parsed.data.name && { name: parsed.data.name }),
    ...(parsed.data.email && { email: parsed.data.email.toLowerCase() }),
    ...(parsed.data.role && { role: parsed.data.role }),
    ...(parsed.data.active !== undefined && { active: parsed.data.active }),
  })

  return NextResponse.json({ user: updated })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id } = await params

  if (!canManageUsers(session?.user?.role, session?.user?.permissions ?? [])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const success = deleteUser(id)
  if (!success) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
