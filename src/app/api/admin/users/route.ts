import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { getPrisma } from "@/server/engine/prisma"

export async function GET() {
  const prisma = getPrisma()
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true, emailVerified: true },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(users)
}

export async function POST(req: Request) {
  const { name, email, password, role = "external" } = await req.json()

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
    data: { name, email, password: hash, role },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })

  return NextResponse.json(user, { status: 201 })
}

export async function PATCH(req: Request) {
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
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const prisma = getPrisma()
  await prisma.user.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
