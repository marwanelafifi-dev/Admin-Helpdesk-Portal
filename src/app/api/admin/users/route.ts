import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { getPrisma } from "@/server/engine/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { withApiHandler } from "@/lib/api-handler"
import { getPaginationParams } from "@/lib/pagination"
import { can } from "@/lib/permissions"
import { isValidUserRole, updateUserRole } from "@/lib/user-admin"

async function getAuthorizedRole() {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role
  if (!session?.user?.id || !role) return null
  return role
}

export const GET = withApiHandler(async (req: Request) => {
  const role = await getAuthorizedRole()
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!can(role, "adminPanel")) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { page, limit, offset } = getPaginationParams(req.url, { page: 1, limit: 10 })
  const prisma = getPrisma()
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        emailVerified: true,
        sessionVersion: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.user.count(),
  ])

  return NextResponse.json({
    data: users,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  })
})

export const POST = withApiHandler(async (req: Request) => {
  const role = await getAuthorizedRole()
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!can(role, "adminPanel")) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { name, email, password, role: newUserRole = "external" } = await req.json()

  if (!name || !email || !password) {
    return NextResponse.json({ error: "name, email, and password are required" }, { status: 400 })
  }

  const prisma = getPrisma()
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: "Email already exists" }, { status: 409 })
  }

  const hash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { name, email, password: hash, role: newUserRole },
    select: { id: true, name: true, email: true, role: true, sessionVersion: true, createdAt: true },
  })

  return NextResponse.json(user, { status: 201 })
})

export const PATCH = withApiHandler(async (req: Request) => {
  const currentRole = await getAuthorizedRole()
  if (!currentRole) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!can(currentRole, "adminPanel")) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id, role, userId, newRoleId } = await req.json()
  const targetUserId = userId ?? id
  const targetRole = newRoleId ?? role

  if (!targetUserId || !targetRole) {
    return NextResponse.json({ error: "userId and newRoleId are required" }, { status: 400 })
  }

  if (!isValidUserRole(targetRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 })
  }

  const user = await updateUserRole(targetUserId, targetRole)

  return NextResponse.json(user)
})

export const DELETE = withApiHandler(async (req: Request) => {
  const role = await getAuthorizedRole()
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!(can(role, "adminPanel") && can(role, "deleteRequests"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const prisma = getPrisma()
  await prisma.user.delete({ where: { id } })
  return NextResponse.json({ ok: true })
})
