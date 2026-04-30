import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

const roles = ["super_admin", "admin", "manager", "requester", "viewer"] as const

const createUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(roles).default("requester"),
  department: z.string().trim().optional(),
})

function canManageUsers(role?: string) {
  return role === "super_admin" || role === "admin"
}

export async function GET() {
  const session = await auth()

  if (!canManageUsers(session?.user?.role)) {
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
    },
  })

  return NextResponse.json({ users })
}

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!canManageUsers(session?.user?.role)) {
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
