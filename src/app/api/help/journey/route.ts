import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { findUserById, updateUser } from "@/lib/userStore"
import { getModuleGuide } from "@/lib/helpGuidance"

// Increase this only when the onboarding journey changes materially and users
// should be shown the new version once more.
export const JOURNEY_MANUAL_VERSION = 1

function moduleIdFromRequest(request: Request) {
  return new URL(request.url).searchParams.get("module")
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = findUserById(session.user.id)
  const moduleId = moduleIdFromRequest(request)
  if (moduleId) {
    const guide = getModuleGuide(moduleId)
    if (!guide) return NextResponse.json({ error: "Unknown module" }, { status: 400 })
    return NextResponse.json({
      shouldShow: (user?.helpModuleManualVersions?.[moduleId] ?? 0) < JOURNEY_MANUAL_VERSION,
      version: JOURNEY_MANUAL_VERSION,
    })
  }
  return NextResponse.json({
    shouldShow: (user?.helpManualVersion ?? 0) < JOURNEY_MANUAL_VERSION,
    version: JOURNEY_MANUAL_VERSION,
  })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const moduleId = moduleIdFromRequest(request)
  if (moduleId) {
    if (!getModuleGuide(moduleId)) return NextResponse.json({ error: "Unknown module" }, { status: 400 })
    const current = findUserById(session.user.id)
    const user = updateUser(session.user.id, {
      helpModuleManualVersions: {
        ...current?.helpModuleManualVersions,
        [moduleId]: JOURNEY_MANUAL_VERSION,
      },
    })
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })
    return NextResponse.json({ ok: true, moduleId, version: JOURNEY_MANUAL_VERSION })
  }
  const user = updateUser(session.user.id, { helpManualVersion: JOURNEY_MANUAL_VERSION })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })
  return NextResponse.json({ ok: true, version: JOURNEY_MANUAL_VERSION })
}
