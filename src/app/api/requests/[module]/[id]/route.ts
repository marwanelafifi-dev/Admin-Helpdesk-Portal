import { NextResponse } from "next/server"
import { z } from "zod"
import { getServerSession } from "next-auth"
import type { Prisma } from "@prisma/client"

import { REQUEST_MODULES, REQUEST_STATUSES } from "@/server/engine/constants"
import { authOptions } from "@/lib/auth"
import { can, isRestricted } from "@/lib/permissions"
import { isReservedRequestPathId } from "@/lib/request-path-guards"
import { prisma } from "@/server/db"
import { sendStatusChangeNotification, sendEmailAsync } from "@/lib/mailer"

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
  if (isReservedRequestPathId(id)) {
    return NextResponse.json({ ok: false, error: "Invalid request id" }, { status: 404 })
  }

  const data = await prisma.request.findUnique({
    where: { id },
    include: { requester: { select: { id: true, name: true, email: true } } },
  })
  if (!data || data.module !== module) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
  }
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
  if (isReservedRequestPathId(id)) {
    return NextResponse.json({ ok: false, error: "Invalid request id" }, { status: 404 })
  }

  try {
    const body = PatchSchema.parse(await request.json())
    const existing = await prisma.request.findUnique({
      where: { id },
      select: { id: true, module: true, requesterId: true, status: true, statusHistory: true },
    })
    if (!existing || existing.module !== module) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
    }

    const nextStatus = body.status
    const shouldRecord = !!nextStatus && nextStatus !== existing.status
    const nowIso = new Date().toISOString()
    const prevHistory = Array.isArray(existing.statusHistory) ? existing.statusHistory : []
    const nextHistory = shouldRecord
      ? [
          ...prevHistory,
          {
            status: nextStatus,
            changedBy: body.changedBy ?? session.user.id,
            changedByName: session.user.name ?? session.user.email ?? session.user.id,
            changedAt: nowIso,
            comment: body.comment,
          },
        ]
      : prevHistory

    const updateData: Prisma.RequestUpdateInput = {}
    if (body.title) updateData.title = body.title
    if (body.payload) updateData.payload = body.payload as Prisma.InputJsonValue
    if (body.status) updateData.status = body.status
    if (nextHistory.length > 0) updateData.statusHistory = nextHistory as Prisma.InputJsonValue

    const updated = await prisma.request.update({
      where: { id },
      data: updateData,
      include: { requester: { select: { id: true, name: true, email: true } } },
    })

    // Send email on status change
    if (shouldRecord && nextStatus && updated.requester.email) {
      const adminUsers = await prisma.user.findMany({
        where: { role: 'admin' },
        select: { email: true },
      })
      const adminEmails = adminUsers.map((u) => u.email).filter(Boolean) as string[]
      const reqForEmail: any = {
        id: updated.id, module: updated.module, title: updated.title,
        status: updated.status, requesterId: updated.requesterId,
        requesterName: updated.requester.name ?? 'Unknown User',
        requesterEmail: updated.requester.email,
        payload: updated.payload as Record<string, unknown>,
        statusHistory: [], createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString(),
      }
      sendEmailAsync(async () => {
        await sendStatusChangeNotification(reqForEmail, nextStatus, updated.requester.email!, adminEmails)
      })
    }

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
  if (isReservedRequestPathId(id)) {
    return NextResponse.json({ ok: false, error: "Invalid request id" }, { status: 404 })
  }

  const existing = await prisma.request.findUnique({ where: { id }, select: { id: true, module: true } })
  if (!existing || existing.module !== module) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
  }

  await prisma.request.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
