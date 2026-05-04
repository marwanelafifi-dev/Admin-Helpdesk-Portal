import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { auth } from "@/auth"
import { canManageUsers } from "@/lib/access"
import { getAssignableRoles, isAllowedRole } from "@/lib/userRoles"
import { prisma } from "@/lib/prisma"

const createUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.string().trim().min(1),
  department: z.string().trim().optional(),
})

export async function GET() {
  const session = await auth()

  if (!canManageUsers(session?.user?.role, session?.user?.permissions ?? [])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      department: true,
      active: true,
      createdAt: true,
      image: true,
      passwordHash: true,
      accounts: {
        select: {
          provider: true,
        },
        take: 1,
      },
    },
  })

  // Map accounts to provider field
  const mappedUsers = users.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    department: user.department,
    active: user.active,
    createdAt: user.createdAt,
    image: user.image,
    provider: user.accounts[0]?.provider || (user.passwordHash ? "local" : undefined),
  }))

  return NextResponse.json({ users: mappedUsers })
}

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!canManageUsers(session?.user?.role, session?.user?.permissions ?? [])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const payload = await request.json()
    const parsed = createUserSchema.safeParse(payload)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid user data", issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const assignableRoles = await getAssignableRoles()

    if (!isAllowedRole(parsed.data.role, assignableRoles)) {
      return NextResponse.json(
        { error: "Selected role is not available", issues: { role: ["Choose a valid role"] } },
        { status: 400 }
      )
    }

    const email = parsed.data.email.toLowerCase()
    const existingUser = await prisma.user.findUnique({ where: { email } })

    if (existingUser) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12)
    const user = await prisma.user.create({
      data: {
        email,
        name: parsed.data.name,
        passwordHash,
        role: parsed.data.role,
        department: parsed.data.department || null,
        active: true,
      },
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

    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    console.error("User creation error:", error)
    return NextResponse.json(
      { error: "Failed to create user", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
