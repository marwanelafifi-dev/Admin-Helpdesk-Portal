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
  // Avatar as a data URL or null to clear. Capped at ~2.7 MB encoded (~ 2 MB raw),
  // matching the client-side upload limit.
  image: z.union([z.string().max(3_000_000), z.null()]).optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id } = await params

  // Any authenticated user can update their own display name. All other edits
  // (email, role, active, or editing someone else) require manage_users.
  const isSelf = session?.user?.id === id
  const isAdmin = canManageUsers(session?.user?.role, session?.user?.permissions ?? [])

  if (!isSelf && !isAdmin) {
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

  // Self-edit is limited to `name` only — block any attempt to escalate by
  // also passing role/email/active in the same request.
  if (isSelf && !isAdmin) {
    const attemptedFields = Object.keys(parsed.data)
    const allowedSelfFields = ["name", "image"]
    const disallowed = attemptedFields.filter((f) => !allowedSelfFields.includes(f))
    if (disallowed.length > 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  const user = findUserById(id)
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const updated = updateUser(id, {
    ...(parsed.data.name && { name: parsed.data.name }),
    ...(parsed.data.image !== undefined && { image: parsed.data.image }),
    ...(isAdmin && parsed.data.email && { email: parsed.data.email.toLowerCase() }),
    ...(isAdmin && parsed.data.role && { role: parsed.data.role }),
    ...(isAdmin && parsed.data.active !== undefined && { active: parsed.data.active }),
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
