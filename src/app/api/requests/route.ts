import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { requestStore } from "@/lib/requestStore"
import { deletedRequestStore } from "@/lib/deletedRequestStore"
import { getDefaultAssignee } from "@/lib/userStore"
import type { EngineRequest } from "@/services/engineService"

export const runtime = "nodejs"

const REQUEST_MODULES = new Set([
  "shipping",
  "maintenance",
  "purchase",
  "event",
  "travel",
  "hr",
  "general",
])

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function normalizeImportedRequest(value: unknown, moduleId: string): EngineRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Each imported request must be a JSON object")
  }

  const request = value as Partial<EngineRequest>
  if (!isNonEmptyString(request.id)) throw new Error("An imported request is missing its ID")
  if (request.module !== moduleId) {
    throw new Error(`Request ${request.id} does not belong to module ${moduleId}`)
  }
  if (!isNonEmptyString(request.title)) throw new Error(`Request ${request.id} is missing its title`)
  if (!isNonEmptyString(request.status)) throw new Error(`Request ${request.id} is missing its status`)
  if (!isNonEmptyString(request.requesterId)) throw new Error(`Request ${request.id} is missing requesterId`)
  if (!isNonEmptyString(request.requesterName)) throw new Error(`Request ${request.id} is missing requesterName`)
  if (!isNonEmptyString(request.requesterEmail)) throw new Error(`Request ${request.id} is missing requesterEmail`)
  if (!request.payload || typeof request.payload !== "object" || Array.isArray(request.payload)) {
    throw new Error(`Request ${request.id} has an invalid payload`)
  }
  if (!Array.isArray(request.statusHistory)) {
    throw new Error(`Request ${request.id} has an invalid status history`)
  }
  if (!isNonEmptyString(request.createdAt) || Number.isNaN(Date.parse(request.createdAt))) {
    throw new Error(`Request ${request.id} has an invalid createdAt date`)
  }
  if (!isNonEmptyString(request.updatedAt) || Number.isNaN(Date.parse(request.updatedAt))) {
    throw new Error(`Request ${request.id} has an invalid updatedAt date`)
  }

  return {
    ...request,
    id: request.id.trim(),
    module: moduleId,
    title: request.title.trim(),
    status: request.status,
    requesterId: request.requesterId.trim(),
    requesterName: request.requesterName.trim(),
    requesterEmail: request.requesterEmail.trim(),
    payload: request.payload,
    statusHistory: request.statusHistory,
    commentHistory: Array.isArray(request.commentHistory) ? request.commentHistory : [],
    adminCc: Array.isArray(request.adminCc) ? request.adminCc : [],
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  } as EngineRequest
}

/**
 * GET /api/requests
 * Returns every request in the shared server store. Used by every list page
 * (My Requests, All Requests, module pages) so users see each others' work.
 * Auth-gated: any signed-in user can read. Client-side filters control what
 * actually renders (e.g. My Requests still filters to current user).
 */
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const id = new URL(req.url).searchParams.get("id")
  const requests = requestStore.getAll()
  if (id) {
    const request = requests.find((item) => item.id === id)
    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }
    return NextResponse.json({ request })
  }

  return NextResponse.json({ data: requests })
}

/**
 * POST /api/requests
 * Creates a new request with a server-issued ID, or upserts an existing
 * request. New clients send operation=create so concurrent submissions can
 * never overwrite each other.
 */
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await req.json()) as {
    operation?: "create" | "upsert" | "import"
    request?: EngineRequest
    requests?: EngineRequest[]
    module?: string
  }

  if (body.operation === "import") {
    const perms = (session.user.permissions as string[] | undefined) ?? []
    const role = session.user.role
    const isAdmin = role === "Full Access"
      || perms.includes("*")
      || perms.includes("manage_users")
      || perms.includes("page:admin-database")
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const requests = body.requests
    const moduleId = body.module
    if (!moduleId || !REQUEST_MODULES.has(moduleId)) {
      return NextResponse.json({ error: "Invalid import module" }, { status: 400 })
    }
    if (!Array.isArray(requests) || requests.length === 0) {
      return NextResponse.json({ error: "Missing import module or requests" }, { status: 400 })
    }
    if (requests.length > 1000) {
      return NextResponse.json({ error: "A single import is limited to 1,000 requests" }, { status: 400 })
    }

    try {
      const normalized = requests.map((request) => normalizeImportedRequest(request, moduleId))
      const deletedIds = new Set(deletedRequestStore.getAll().map((entry) => entry.request.id))
      const recycled = normalized.find((request) => deletedIds.has(request.id))
      if (recycled) {
        throw new Error(`Request ID ${recycled.id} already exists in the recycle bin`)
      }

      const imported = requestStore.importMany(normalized)
      return NextResponse.json({ imported: imported.length, requests: imported })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Import failed"
      return NextResponse.json(
        { error: message },
        { status: message.includes("already exists") ? 409 : 400 }
      )
    }
  }

  if (!body?.request || !body.request.id) {
    return NextResponse.json({ error: "Missing request payload" }, { status: 400 })
  }

  const incoming = body.request

  // Auto-assign: if this is a brand-new request (no existing record with the
  // same id) and the incoming payload doesn't already specify an assignee,
  // stamp on the currently-configured default assignee (if one exists).
  let assignee = {
    assignedToId: incoming.assignedToId ?? null,
    assignedToName: incoming.assignedToName ?? null,
    assignedToEmail: incoming.assignedToEmail ?? null,
  }
  const existing = requestStore.getAll().find((r) => r.id === incoming.id)
  const isNew = body.operation === "create" || !existing
  if (isNew && !assignee.assignedToId) {
    const defaultAssignee = getDefaultAssignee()
    if (defaultAssignee) {
      assignee = {
        assignedToId: defaultAssignee.id,
        assignedToName: defaultAssignee.name,
        assignedToEmail: defaultAssignee.email,
      }
    }
  }

  const requestToSave = {
    ...incoming,
    ...assignee,
    updatedAt: incoming.updatedAt || new Date().toISOString(),
  }

  if (
    body.operation !== "create" &&
    existing &&
    existing.createdAt !== incoming.createdAt
  ) {
    return NextResponse.json(
      { error: `Request ID ${incoming.id} already exists` },
      { status: 409 }
    )
  }

  const saved = body.operation === "create"
    ? requestStore.create(requestToSave)
    : requestStore.upsert(requestToSave)

  return NextResponse.json({ request: saved })
}

/**
 * DELETE /api/requests?id=XYZ
 * Removes a single request. Currently unused by the UI but exposed for the
 * Database admin page's Clear flow.
 */
export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Permanent-delete is admin-only. Requires Full Access OR manage_users
  // OR the `*` wildcard — same gate as the rest of the user-management API.
  const perms = (session.user.permissions as string[] | undefined) ?? []
  const role = session.user.role
  const isAdmin = role === "Full Access" || perms.includes("*") || perms.includes("manage_users")
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const url = new URL(req.url)
  const id = url.searchParams.get("id")
  const moduleId = url.searchParams.get("module")

  // ?module=foo — wipe every request in that module (used by the per-module
  // Clear buttons on Admin → Database).
  if (moduleId) {
    const all = requestStore.getAll()
    const remaining = all.filter((r) => r.module !== moduleId)
    requestStore.bulkReplace(remaining)
    return NextResponse.json({ success: true, removed: all.length - remaining.length })
  }

  // No id and no module — wipe everything.
  if (!id) {
    requestStore.clear()
    return NextResponse.json({ success: true, cleared: "all" })
  }

  // Single-id permanent delete — save a snapshot to the recycle bin first
  // so the admin can restore it if deleted by mistake.
  const allRequests = requestStore.getAll()
  const toDelete = allRequests.find((r) => r.id === id)
  if (toDelete) {
    const actor = session.user.name ?? session.user.email ?? "Admin"
    deletedRequestStore.save(toDelete, actor)
  }

  const removed = requestStore.remove(id)
  return NextResponse.json({ success: removed })
}
