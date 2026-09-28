import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { readFinanceSlaReminders } from "@/lib/financeSlaReminderStore"
import { roleToFunctionId } from "@/lib/functionRegistry"
import { requestStore } from "@/lib/requestStore"

export const runtime = "nodejs"

const TERMINAL = new Set(["completed", "cancelled", "delivered", "rejected"])

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "Full Access" && roleToFunctionId(session.user.role) !== "finance") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const requests = new Map(requestStore.getAll().map((request) => [request.id, request]))
  const reminders = readFinanceSlaReminders()
    .filter((reminder) => !TERMINAL.has(String(requests.get(reminder.requestId)?.status ?? "")))
    .sort((a, b) => a.deadlineDate.localeCompare(b.deadlineDate))

  return NextResponse.json({ data: reminders, count: reminders.length })
}
