import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { auth } from "@/auth"
import { canManageUsers } from "@/lib/access"
import { readUsers, createUser, findUserByEmail } from "@/lib/userStore"
import { sendWelcomeEmail } from "@/lib/emailService"
import { logServerAudit } from "@/lib/serverAuditLog"
import { getCompanyFromEmail } from "@/lib/userCompany"
import { getDefaultRequesterRoleForEmail } from "@/lib/userCompany"

const createUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Valid email is required").refine(
    (email) => getCompanyFromEmail(email) !== null,
    "Only @si-ware.com and @buchi.com accounts are supported"
  ),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  role: z.string().trim().min(1),
  department: z.string().trim().optional(),
})

export async function GET() {
  const session = await auth()

  if (!canManageUsers(session?.user?.role, session?.user?.permissions ?? [])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const users = readUsers().map((u) => {
    const company = getCompanyFromEmail(u.email)
    return ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    active: u.active,
    createdAt: u.createdAt,
    image: u.image,
    provider: u.provider,
    defaultAssignee: u.defaultAssignee ?? false,
    mustChangePassword: u.provider === "credentials" ? (u.mustChangePassword ?? false) : false,
    companyId: u.companyId ?? company?.id ?? null,
    companyName: u.companyName ?? company?.name ?? "Unclassified",
  })})

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
      role: getDefaultRequesterRoleForEmail(email),
      image: null,
      active: true,
      provider: "credentials",
      mustChangePassword: true,
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
        mustChangePassword: true,
      })
    } catch (emailErr) {
      console.error("Failed to send welcome email:", emailErr)
      // Don't fail user creation if email fails
    }

    logServerAudit({
      actor: session?.user?.name ?? session?.user?.email ?? "Admin",
      actorEmail: session?.user?.email ?? "",
      action: "user_created",
      targetId: user.email,
      targetTitle: user.name,
      details: `New user created: ${user.name} <${user.email}> with role "${user.role}"`,
      category: "user",
    })

    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create user", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
