import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import bcrypt from "bcryptjs"
import { findUserById, updateUser } from "@/lib/userStore"

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

    const { password } = await request.json()

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

    const passwordHash = await bcrypt.hash(password, 12)
    updateUser(userId, { passwordHash })

    return NextResponse.json({ success: true, message: "Password updated successfully" })
  } catch (error) {
    console.error("Password reset error:", error)
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    )
  }
}
