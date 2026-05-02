import { NextResponse } from "next/server"
import { z } from "zod"
import { getServerSession } from "next-auth"

import { REQUEST_MODULES, REQUEST_STATUSES } from "@/server/engine/constants"
import { deleteRequest, getRequest, updateRequest } from "@/server/engine/store"
import { authOptions } from "@/lib/auth"
import { can, isRestricted } from "@/lib/permissions"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function isKnownModule(module: string): boolean {
  return (REQUEST_MODULES as readonly string[]).includes(module)
}

const PatchSchema = z
  .object({
    title: z.string().min(1).optional(),
    payload: z.record(z.string(), z.unknown()).optional(),
    status: z.enum(REQUEST_STATUSES).optional(),
    changedBy: z.string().min(1).optional(),
    comment: z.string().optional(),
  })
  .strict()

export async function GET(_request: Request, context: { params: Promise<{ module: string; id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.role) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const { module, id } = await context.params
  if (!isKnownModule(module)) {
    return NextResponse.json({ ok: false, error: "Unknown module" }, { status: 404 })
  }

  const data = await getRequest(module, id)
  if (!data) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
  if (isRestricted(session.user.role) && data.requesterId !== session.user.id) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }
  return NextResponse.json({ ok: true, data })
}

export async function PATCH(request: Request, context: { params: Promise<{ module: string; id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.role) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  if (!can(session.user.role, "updateRequests")) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }

  const { module, id } = await context.params
  if (!isKnownModule(module)) {
    return NextResponse.json({ ok: false, error: "Unknown module" }, { status: 404 })
  }

  try {
    const body = PatchSchema.parse(await request.json())
    const updated = await updateRequest(module, id, body)
    if (!updated) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
    return NextResponse.json({ ok: true, data: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid patch"
    return NextResponse.json({ ok: false, error: message }, { status: 400 })
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ module: string; id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.role) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  if (!can(session.user.role, "deleteRequests")) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }

  const { module, id } = await context.params
  if (!isKnownModule(module)) {
    return NextResponse.json({ ok: false, error: "Unknown module" }, { status: 404 })
  }

  const ok = await deleteRequest(module, id)
  if (!ok) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
  return NextResponse.json({ ok: true })
}
