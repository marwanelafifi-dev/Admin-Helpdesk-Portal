import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { readAdminSlaReminders } from "@/lib/adminSlaReminderStore"
import { canAccessAdministrationSlaReminders } from "@/lib/functionRegistry"
import { requestStore } from "@/lib/requestStore"

export const runtime = "nodejs"
const TERMINAL = new Set(["completed", "cancelled", "delivered", "rejected"])

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!canAccessAdministrationSlaReminders(session.user.role, session.user.permissions ?? [])) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const requests = new Map(requestStore.getAll().map((request) => [request.id, request]))
  const data = readAdminSlaReminders().filter((item) => !TERMINAL.has(String(requests.get(item.requestId)?.status ?? ""))).sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
  return NextResponse.json({ data, count: data.length })
}
