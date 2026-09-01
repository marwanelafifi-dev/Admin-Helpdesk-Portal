import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { auth } from "@/auth"
import { canManageUsers } from "@/lib/access"
import { createUser, findUserByEmail } from "@/lib/userStore"
import { getCompanyFromEmail, getDefaultRequesterRoleForEmail } from "@/lib/userCompany"
import { sendWelcomeEmail } from "@/lib/emailService"
import { logServerAudit } from "@/lib/serverAuditLog"

const rowSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Valid email is required").refine(
    (email) => getCompanyFromEmail(email) !== null,
    "Only @si-ware.com and @buchi.com accounts are supported"
  ),
  password: z.string().min(8, "Password must be at least 8 characters"),
  department: z.string().trim().optional(),
})

const importSchema = z.object({
  users: z.array(rowSchema).min(1).max(500),
})

export async function POST(request: Request) {
  const session = await auth()
  if (!canManageUsers(session?.user?.role, session?.user?.permissions ?? [])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const parsed = importSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({
      error: "Invalid CSV user data",
      issues: parsed.error.issues.map((issue) => ({ row: Number(issue.path[1] ?? 0) + 2, message: issue.message })),
    }, { status: 400 })
  }

  const normalizedEmails = parsed.data.users.map((user) => user.email.toLowerCase())
  const duplicates = normalizedEmails.filter((email, index) => normalizedEmails.indexOf(email) !== index)
  if (duplicates.length > 0) {
    return NextResponse.json({ error: `Duplicate email in CSV: ${duplicates[0]}` }, { status: 409 })
  }

  const existing = normalizedEmails.find((email) => findUserByEmail(email))
  if (existing) {
    return NextResponse.json({ error: `A user with email ${existing} already exists` }, { status: 409 })
  }

  const passwordHashes = await Promise.all(parsed.data.users.map((user) => bcrypt.hash(user.password, 12)))
  const created = parsed.data.users.map((row, index) => createUser({
    email: row.email.toLowerCase(),
    name: row.name,
    role: getDefaultRequesterRoleForEmail(row.email),
    image: null,
    active: true,
    provider: "credentials",
    passwordHash: passwordHashes[index],
    ...(row.department && { department: row.department }),
  }))

  const loginUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3003"}/login`
  const emailResults = await Promise.allSettled(created.map((user, index) => sendWelcomeEmail({
    to: user.email,
    name: user.name,
    password: parsed.data.users[index].password,
    loginUrl,
  })))

  logServerAudit({
    actor: session?.user?.name ?? session?.user?.email ?? "Admin",
    actorEmail: session?.user?.email ?? "",
    action: "user_created",
    targetId: `csv-import-${Date.now()}`,
    targetTitle: `${created.length} local users`,
    details: `Imported ${created.length} local users from CSV (${created.filter((u) => u.role === "Requester - BUCHI").length} BUCHI, ${created.filter((u) => u.role === "Requester - Si-Ware").length} Si-Ware)`,
    category: "user",
  })

  return NextResponse.json({
    imported: created.length,
    welcomeEmailsFailed: emailResults.filter((result) => result.status === "rejected").length,
    users: created.map(({ passwordHash: _passwordHash, ...user }) => user),
  }, { status: 201 })
}
