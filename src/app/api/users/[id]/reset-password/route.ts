import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import bcrypt from "bcryptjs"
import { findUserById, updateUser } from "@/lib/userStore"
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

    const user = findUserById(userId)
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

    const passwordHash = await bcrypt.hash(password, 12)
    updateUser(userId, { passwordHash })

    const isAdminReset = session.user.id !== userId
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
