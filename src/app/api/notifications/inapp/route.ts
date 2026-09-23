import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { serverNotificationStore } from "@/lib/serverNotificationStore"
import { FUNCTION_IDS, type FunctionId } from "@/lib/functionRegistry"

export const runtime = "nodejs"

// GET /api/notifications/inapp?since=<iso>
// Returns notifications for the authenticated user, optionally only those
// created after `since` (for incremental polling).
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ data: [] }, { status: 401 })
  }

  const since = req.nextUrl.searchParams.get("since") ?? undefined
  const requestedFunction = req.nextUrl.searchParams.get("functionId")
  const functionId = FUNCTION_IDS.includes(requestedFunction as FunctionId)
    ? requestedFunction as FunctionId
    : undefined
  const notifications = serverNotificationStore.getForUser(session.user.id, since, functionId)
  return NextResponse.json({ data: notifications })
}

// POST /api/notifications/inapp
// Saves one or many notifications server-side (called from client after
// addNotification writes to localStorage, so both stores stay in sync).
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const items = Array.isArray(body) ? body : [body]
    // A browser may persist only its own notifications. Server-side actions
    // that notify other users write through serverNotificationStore directly.
    if (!items.every((item) => item && item.userId === session.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    serverNotificationStore.addMany(items)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 })
  }
}

// PATCH /api/notifications/inapp — mark one or all as read
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { notificationId, all, functionId: requestedFunction } = await req.json().catch(() => ({}))
  if (all) {
    const functionId = FUNCTION_IDS.includes(requestedFunction as FunctionId)
      ? requestedFunction as FunctionId
      : undefined
    serverNotificationStore.markAllRead(session.user.id, functionId)
  } else if (notificationId) {
    serverNotificationStore.markRead(notificationId, session.user.id)
  }
  return NextResponse.json({ ok: true })
}
