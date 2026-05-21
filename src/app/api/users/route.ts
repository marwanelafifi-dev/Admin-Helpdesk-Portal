import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { auth } from "@/auth"
import { canManageUsers } from "@/lib/access"
import { readUsers, createUser, findUserByEmail } from "@/lib/userStore"
import { sendWelcomeEmail } from "@/lib/emailService"

const createUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  role: z.string().trim().min(1),
  department: z.string().trim().optional(),
})

export async function GET() {
  const session = await auth()

  if (!canManageUsers(session?.user?.role, session?.user?.permissions ?? [])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const users = readUsers().map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    active: u.active,
    createdAt: u.createdAt,
    image: u.image,
    provider: u.provider,
    defaultAssignee: u.defaultAssignee ?? false,
  }))

  return NextResponse.json({ users })
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

    const email = parsed.data.email.toLowerCase()
    if (findUserByEmail(email)) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 })
    }

    const passwordHash = parsed.data.password
      ? await bcrypt.hash(parsed.data.password, 12)
      : undefined

    const user = createUser({
      email,
      name: parsed.data.name,
      role: "requester",
      image: null,
      active: true,
      provider: "credentials",
      ...(passwordHash && { passwordHash }),
    })

    // Send welcome email with credentials
    const loginUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3003"}/login`
    try {
      await sendWelcomeEmail({
        to: email,
        name: parsed.data.name,
        password: parsed.data.password!,
        loginUrl,
      })
    } catch (emailErr) {
      console.error("Failed to send welcome email:", emailErr)
      // Don't fail user creation if email fails
    }

    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create user", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
