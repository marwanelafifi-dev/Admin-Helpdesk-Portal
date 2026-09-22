import { NextRequest, NextResponse } from "next/server"
import { feedbackStore } from "@/lib/feedbackStore"
import { auth } from "@/auth"
import { modulesVisibleToFunction, roleToFunctionId } from "@/lib/functionRegistry"

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
export async function DELETE(_req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 })
  }
  feedbackStore.clearAll()
  return NextResponse.json({ cleared: true })
}
