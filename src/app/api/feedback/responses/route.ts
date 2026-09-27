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
  if (!functionId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const visibleModules = new Set(modulesVisibleToFunction(functionId))
  return NextResponse.json({ responses: feedbackStore.getResponses().filter((response) => visibleModules.has(response.module)) })
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
