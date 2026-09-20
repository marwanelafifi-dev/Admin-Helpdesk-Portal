import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { canManageUsers } from "@/lib/access"
import { getDefaultAssignee, setDefaultAssignee, findUserById } from "@/lib/userStore"
import { FUNCTION_IDS, roleToFunctionId, type FunctionId } from "@/lib/functionRegistry"

export const runtime = "nodejs"

/**
 * GET /api/users/default-assignee
 * Returns the selected function's default assignee, or null if none is set.
 * Defaults to Administration for backward compatibility.
 */
function parseFunctionId(value: unknown): FunctionId | null {
  return typeof value === "string" && FUNCTION_IDS.includes(value as FunctionId)
    ? value as FunctionId
    : null
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const functionId = parseFunctionId(new URL(req.url).searchParams.get("function")) ?? "admin"
  const user = getDefaultAssignee(functionId)
  if (!user) {
    return NextResponse.json({ data: null })
  }
  return NextResponse.json({ data: { id: user.id, name: user.name, email: user.email, role: user.role } })
}

/**
 * POST /api/users/default-assignee
 * Body: { userId: string | null, functionId: "admin" | "hr" | "finance" }
 * Sets the given user as the selected function's sole default assignee.
 * Pass userId = null to clear only that function's default.
 * Requires manage_users (admin only).
 */
export async function POST(req: Request) {
  const session = await auth()
  if (!canManageUsers(session?.user?.role, session?.user?.permissions ?? [])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: { userId?: string | null; functionId?: string } = {}
  try { body = await req.json() } catch { /* ignore */ }
  const userId = body.userId ?? null
  let functionId = parseFunctionId(body.functionId)

  if (userId) {
    const target = findUserById(userId)
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    if (!target.active) {
      return NextResponse.json({ error: "An inactive user cannot be the default assignee" }, { status: 400 })
    }
    const targetFunction = roleToFunctionId(target.role)
    if (!targetFunction) {
      return NextResponse.json(
        { error: "Only Administration, HR, or Finance Team members can be set as default assignees" },
        { status: 400 }
      )
    }
    if (functionId && functionId !== targetFunction) {
      return NextResponse.json({ error: "The user does not belong to the selected function" }, { status: 400 })
    }
    functionId = targetFunction
  } else if (!functionId) {
    return NextResponse.json({ error: "A valid functionId is required when clearing a default assignee" }, { status: 400 })
  }

  const selectedFunction = functionId ?? "admin"
  const updated = setDefaultAssignee(userId, selectedFunction)
  return NextResponse.json({
    functionId: selectedFunction,
    data: updated ? { id: updated.id, name: updated.name, email: updated.email, role: updated.role } : null,
  })
}
