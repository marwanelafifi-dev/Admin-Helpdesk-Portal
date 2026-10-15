import { NextRequest, NextResponse } from "next/server"
import { feedbackStore, type StoredFeedbackSurvey } from "@/lib/feedbackStore"
import { auth } from "@/auth"
import { functionForModule, FUNCTION_IDS, roleToFunctionId, type FunctionId } from "@/lib/functionRegistry"
import { requestStore } from "@/lib/requestStore"

export const runtime = "nodejs"

// Auth-protected — used by Feedback & Reports dashboard.
/**
 * Determines ownership from the stored request, never from client-provided or
 * legacy feedback metadata. A malformed or stale overall response is hidden
 * rather than being shown in the wrong function's confidential report.
 */
function belongsToFunction(response: StoredFeedbackSurvey, functionId: FunctionId): boolean {
  if (response.feedbackScope !== "overall") {
    return functionForModule(response.module) === functionId
  }

  const coveredRequestIds = response.coveredRequestIds ?? []
  return coveredRequestIds.length > 0 && coveredRequestIds.every((requestId) => {
    const request = requestStore.get(requestId)
    return Boolean(request) && functionForModule(request.module) === functionId
  })
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 })
  }
  const requestedFunction = req.nextUrl.searchParams.get("function")
  const isFullAccess = session.user.role === "Full Access"
  const memberFunction = roleToFunctionId(session.user.role)

  if (requestedFunction && !FUNCTION_IDS.includes(requestedFunction as FunctionId)) {
    return NextResponse.json({ error: "Invalid function" }, { status: 400 })
  }
  if (requestedFunction && !isFullAccess && requestedFunction !== memberFunction) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Full Access users may select a portal context, but regular team members
  // are permanently confined to their own function.
  const functionId = (requestedFunction as FunctionId | null) ?? (isFullAccess ? "admin" : memberFunction)
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
  return NextResponse.json({
    responses: feedbackStore.getResponses().filter((response) => belongsToFunction(response, functionId)),
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
