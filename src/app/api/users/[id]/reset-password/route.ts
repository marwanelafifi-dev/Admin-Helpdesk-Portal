import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import bcrypt from "bcryptjs"
import { findUserByEmail, findUserById, updateUser } from "@/lib/userStore"
import { logServerAudit } from "@/lib/serverAuditLog"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (await params).id

    // Only allow users to change their own password (or Full Access admins)
    if (session.user.id !== userId && session.user.role !== "Full Access") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { password, currentPassword } = await request.json()

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      )
    }

    // Local development can use database-backed accounts while the legacy
    // user store still holds first-login state. Resolve both stores so a
    // database session is not incorrectly reported as an unknown user.
    let dbUser: {
      id: string
      email: string
      name: string
      passwordHash: string | null
      googleId: string | null
    } | null = null

    try {
      const { prisma } = await import("@/lib/prisma")
      dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          passwordHash: true,
          googleId: true,
        },
      })
    } catch (error) {
      console.warn("Database user lookup failed; using the local user store", error)
    }

    const fileUser = findUserById(userId) ?? (dbUser ? findUserByEmail(dbUser.email) : undefined)
    const user = dbUser
      ? {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          passwordHash: dbUser.passwordHash ?? undefined,
          provider: dbUser.googleId ? "google" : "credentials",
        }
      : fileUser
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (user.provider === "google") {
      return NextResponse.json({ error: "Cannot set a password for Google accounts" }, { status: 400 })
    }

    // When changing own password, verify current password first
    // Admin (Full Access) resetting another user's password skips this check
    const isOwnPasswordChange = session.user.id === userId
    if (isOwnPasswordChange) {
      if (!currentPassword) {
        return NextResponse.json({ error: "Current password is required" }, { status: 400 })
      }
      if (!user.passwordHash) {
        return NextResponse.json({ error: "No password set for this account" }, { status: 400 })
      }
      const currentMatches = await bcrypt.compare(currentPassword, user.passwordHash)
      if (!currentMatches) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
      }
    }

    const isAdminReset = session.user.id !== userId
    const passwordHash = await bcrypt.hash(password, 12)

    if (dbUser) {
      const { prisma } = await import("@/lib/prisma")
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { passwordHash, active: true },
      })
    }

    // Keep the local first-login flag synchronized when the account exists
    // in both stores. This is what clears the forced-password-change screen.
    if (fileUser) {
      updateUser(fileUser.id, {
        passwordHash,
        // Self-service completes first-login setup; an admin reset creates a
        // new temporary password and requires another change.
        mustChangePassword: isAdminReset,
      })
    }
    logServerAudit({
      actor: session.user.name ?? session.user.email ?? "Unknown",
      actorEmail: session.user.email ?? "",
      action: "user_password_reset",
      targetId: user.email,
      targetTitle: user.name,
      details: isAdminReset
        ? `Admin reset password for ${user.name} <${user.email}>`
        : `${user.name} changed their own password`,
      category: "user",
    })

    return NextResponse.json({ success: true, message: "Password updated successfully" })
  } catch (error) {
    console.error("Password reset error:", error)
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    )
  }
}
