import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { getPrisma } from "@/server/engine/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { can } from "@/lib/permissions"

async function getAuthorizedRole() {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role
  if (!session?.user?.id || !role) return null
  return role
}

export async function GET() {
  const role = await getAuthorizedRole()
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!can(role, "adminPanel")) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const prisma = getPrisma()
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true, emailVerified: true },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(users)
}

export async function POST(req: Request) {
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
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })

  return NextResponse.json(user, { status: 201 })
}

export async function PATCH(req: Request) {
  const currentRole = await getAuthorizedRole()
  if (!currentRole) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!can(currentRole, "adminPanel")) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id, role } = await req.json()

  if (!id || !role) {
    return NextResponse.json({ error: "id and role are required" }, { status: 400 })
  }

  const validRoles = ["super_admin", "admin", "manager", "employee", "external"]
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 })
  }

  const prisma = getPrisma()
  const user = await prisma.user.update({
    where: { id },
    data: { role },
    select: { id: true, name: true, email: true, role: true, createdAt: true, emailVerified: true },
  })

  return NextResponse.json(user)
}

export async function DELETE(req: Request) {
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
}
