import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { withApiHandler } from "@/lib/api-handler"
import { getMaintenanceModeState, setMaintenanceModeOverride } from "@/lib/maintenance-mode"

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role

  if (!session?.user?.id || role !== "super_admin") {
    return null
  }

  return session.user
}

export const GET = withApiHandler(async () => {
  const user = await requireSuperAdmin()
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return NextResponse.json(getMaintenanceModeState())
})

export const PATCH = withApiHandler(async (req: Request) => {
  const user = await requireSuperAdmin()
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { enabled } = await req.json() as { enabled?: boolean }
  if (typeof enabled !== "boolean") {
    return NextResponse.json({ error: "enabled must be a boolean" }, { status: 400 })
  }

  setMaintenanceModeOverride(enabled)

  return NextResponse.json({
    message: `Maintenance Mode ${enabled ? "enabled" : "disabled"}`,
    ...getMaintenanceModeState(),
  })
})
