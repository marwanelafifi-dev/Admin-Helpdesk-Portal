import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { withApiHandler } from "@/lib/api-handler"
import { can } from "@/lib/permissions"
import { enforceJsonBodyLimit } from "@/lib/request-security"
import { isValidUserRole, updateUserRole } from "@/lib/user-admin"

export const PATCH = withApiHandler(async (req: Request) => {
  const sizeError = enforceJsonBodyLimit(req, 16 * 1024)
  if (sizeError) return sizeError

  const session = await getServerSession(authOptions)
  const role = session?.user?.role

  if (!session?.user?.id || !role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!can(role, "adminPanel")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { userId, newRoleId } = await req.json()

  if (!userId || !newRoleId) {
    return NextResponse.json(
      { error: "userId and newRoleId are required" },
      { status: 400 }
    )
  }

  if (!isValidUserRole(newRoleId)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 })
  }

  const updatedUser = await updateUserRole(userId, newRoleId)

  return NextResponse.json({
    message: "User role updated successfully",
    user: updatedUser,
    sessionHandling: {
      sessionVersion: updatedUser.sessionVersion,
      effect: "Role changes are picked up on the next authenticated request or session refresh.",
    },
  })
})
