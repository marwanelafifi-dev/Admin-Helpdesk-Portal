import { NextResponse } from "next/server"

import { REQUEST_MODULES } from "@/server/engine/constants"
import { createRequest, listRequests } from "@/server/engine/store"
import { sendNewRequestNotification } from "@/lib/mailer"
import { getPrisma } from "@/server/engine/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function isKnownModule(module: string): boolean {
  return (REQUEST_MODULES as readonly string[]).includes(module)
}

async function getAdminEmails(): Promise<string[]> {
  try {
    const prisma = getPrisma()
    const admins = await prisma.user.findMany({
      where: { role: { in: ["admin", "super_admin"] } },
      select: { email: true },
    })
    return admins.map((u) => u.email).filter(Boolean) as string[]
  } catch {
    return []
  }
}

export async function GET(request: Request, context: { params: Promise<{ module: string }> }) {
  const { module } = await context.params
  if (!isKnownModule(module)) {
    return NextResponse.json({ ok: false, error: "Unknown module" }, { status: 404 })
  }

  const url = new URL(request.url)
  const statusParams = url.searchParams.getAll("status")
  const status = statusParams.flatMap((s) => s.split(",")).map((s) => s.trim()).filter(Boolean)

  const data = await listRequests({
    module,
    requesterId: url.searchParams.get("requesterId") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    status: status.length > 0 ? status : undefined,
  })

  return NextResponse.json({ ok: true, data })
}

export async function POST(request: Request, context: { params: Promise<{ module: string }> }) {
  const { module } = await context.params
  if (!isKnownModule(module)) {
    return NextResponse.json({ ok: false, error: "Unknown module" }, { status: 404 })
  }

  try {
    const body = await request.json()
    const created = await createRequest(module, body)

    // Fire-and-forget — never blocks the response
    getAdminEmails().then((emails) => sendNewRequestNotification(created, emails))

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request body"
    return NextResponse.json({ ok: false, error: message }, { status: 400 })
  }
}
