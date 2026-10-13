import { NextRequest, NextResponse } from "next/server"
import { feedbackStore } from "@/lib/feedbackStore"
import { auth } from "@/auth"
import { modulesVisibleToFunction, roleToFunctionId, type FunctionId } from "@/lib/functionRegistry"

export const runtime = "nodejs"

// Auth-protected — used by Feedback & Reports dashboard.
export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 })
  }
  const functionId = session.user.role === "Full Access" ? "admin" : roleToFunctionId(session.user.role)
  // Requesters need their own responses to restore the per-request and
  // overall-feedback state across devices, but must never receive the
  // function-wide feedback feed used by the reporting pages.
  if (!functionId) {
    const requesterEmail = session.user.email?.trim().toLowerCase()
    if (!requesterEmail) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    return NextResponse.json({
      responses: feedbackStore.getResponses().filter(
        (response) => response.requesterEmail.trim().toLowerCase() === requesterEmail,
      ),
    })
  }
  const visibleModules = new Set(modulesVisibleToFunction(functionId))
  return NextResponse.json({
    responses: feedbackStore.getResponses().filter((response) =>
      response.feedbackScope === "overall"
        ? response.functionId === functionId
        : visibleModules.has(response.module),
    ),
  })
}

// Auth-protected — Admin Database clear action.
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 })
  }
  const permissions = (session.user.permissions as string[] | undefined) ?? []
  const isAdmin = session.user.role === "Full Access" || permissions.includes("*") || permissions.includes("manage_users")
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const requestedFunction = req.nextUrl.searchParams.get("function")
  if (requestedFunction) {
    if (!(["admin", "hr", "finance"] as const).includes(requestedFunction as FunctionId)) {
      return NextResponse.json({ error: "Invalid function" }, { status: 400 })
    }
    const cleared = feedbackStore.clearByFunction(requestedFunction as FunctionId)
    return NextResponse.json({ cleared: true, function: requestedFunction, ...cleared })
  }

  feedbackStore.clearAll()
  return NextResponse.json({ cleared: true })
}
