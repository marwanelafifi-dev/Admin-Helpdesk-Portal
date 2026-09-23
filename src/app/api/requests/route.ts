import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { requestStore } from "@/lib/requestStore"
import { deletedRequestStore } from "@/lib/deletedRequestStore"
import { getDefaultAssignee } from "@/lib/userStore"
import type { EngineRequest } from "@/services/engineService"
import { getCompanyFromEmail, getRequestCompany } from "@/lib/userCompany"
import { scopeRequestsByModuleAccess, type UserWithModuleAccess } from "@/lib/access"
import { functionForModule, isRequestVisibleToViewer, MODULE_REGISTRY } from "@/lib/functionRegistry"
import { logServerAudit } from "@/lib/serverAuditLog"

export const runtime = "nodejs"

// Keep imports in sync with every function's registered request modules.
const REQUEST_MODULES = new Set(Object.keys(MODULE_REGISTRY))

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function withCompanyClassification(request: EngineRequest): EngineRequest {
  const company = getRequestCompany(request.module, request.requesterEmail)
  return {
    ...request,
    companyId: company?.id,
    companyName: company?.name,
  }
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

  const company = getRequestCompany(moduleId, request.requesterEmail)
  return {
    ...request,
    id: request.id.trim(),
    module: moduleId,
    title: request.title.trim(),
    status: request.status,
    requesterId: request.requesterId.trim(),
    requesterName: request.requesterName.trim(),
    requesterEmail: request.requesterEmail.trim(),
    ...(company ? { companyId: company.id, companyName: company.name } : {}),
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
  // Classify legacy records at read time as well as new writes. This keeps old
  // requests usable without a destructive data migration.
  const classifiedRequests = requestStore.getAll().map(withCompanyClassification)
  const userWithModules: UserWithModuleAccess = {
    id: session.user.id,
    email: session.user.email ?? undefined,
    role: session.user.role,
    readModules: (session.user as any).readModules,
    readAllModules: (session.user as any).readAllModules,
  }
  const isBuchiSession = session.user.role?.toLowerCase().includes("buchi")
    || getCompanyFromEmail(session.user.email)?.id === "buchi"
  const companyScoped = isBuchiSession
    ? scopeRequestsByModuleAccess(classifiedRequests, userWithModules, session.user)
    : classifiedRequests

  // Function-confidentiality scoping: modules exclusive to another function
  // (e.g. hr_general, hr_letter, finance_reimbursement) are hidden from
  // everyone except Full Access, that function's own team, the request's
  // requester, or a CC'd recipient. Admin-visible modules stay open to any
  // signed-in user, matching the existing platform convention.
  const viewerEmail = session.user.email ?? undefined
  const viewerRole = session.user.role
  const isVisible = (r: EngineRequest) =>
    isRequestVisibleToViewer({
      moduleId: r.module,
      role: viewerRole,
      permissions: session.user.permissions ?? [],
      readAllModules: (session.user as any).readAllModules ?? [],
      viewerEmail,
      requesterEmail: r.requesterEmail,
      ccEmails: [
        ...((Array.isArray((r.payload as any)?.ccEmails) ? (r.payload as any).ccEmails : [])),
        ...(Array.isArray(r.adminCc) ? r.adminCc : []),
      ],
    })
  const requests = companyScoped.filter(isVisible)

  if (id) {
    const request = requests.find((item) => item.id === id)
    if (!request) {
      // Return an explicit access result when the record exists but is outside
      // the caller's scope. The client uses this to show a clear restricted
      // screen instead of falling back to browser-cached confidential data.
      const existsButRestricted = companyScoped.some((item) => item.id === id)
      if (existsButRestricted) {
        return NextResponse.json(
          { error: "Access restricted", code: "REQUEST_ACCESS_DENIED" },
          { status: 403 },
        )
      }
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
      logServerAudit({
        actor: session.user.name ?? session.user.email ?? "System", actorEmail: session.user.email ?? "",
        action: "system_event", targetId: moduleId, targetTitle: "Request import",
        details: `${imported.length} ${moduleId} request(s) imported`, category: "system", outcome: "success",
      })
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
  // stamp on the owning function's configured default (if one exists).
  let assignee = {
    assignedToId: incoming.assignedToId ?? null,
    assignedToName: incoming.assignedToName ?? null,
    assignedToEmail: incoming.assignedToEmail ?? null,
  }
  const existing = requestStore.getAll().find((r) => r.id === incoming.id)
  const isNew = body.operation === "create" || !existing
  if (isNew && !assignee.assignedToId) {
    const defaultAssignee = getDefaultAssignee(functionForModule(incoming.module))
    if (defaultAssignee) {
      assignee = {
        assignedToId: defaultAssignee.id,
        assignedToName: defaultAssignee.name,
        assignedToEmail: defaultAssignee.email,
      }
    }
  }

  const requesterEmail = isNew
    ? (session.user.email ?? incoming.requesterEmail)
    : (existing?.requesterEmail ?? incoming.requesterEmail)
  const company = getRequestCompany(incoming.module, requesterEmail)
  const requestToSave = {
    ...incoming,
    ...assignee,
    requesterEmail,
    companyId: company?.id,
    companyName: company?.name,
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

  // Convert old browser-only Travel letters (HRLTR-<timestamp>-<random>) the
  // first time they reach the shared store. This keeps historical records in
  // the same HRLTR-YYYY-#### series as new letters and repairs the linked
  // Travel request at the same time. clientRequestId makes repeated syncs
  // idempotent.
  const isLegacyTravelLetter = incoming.module === "hr_travel_letter"
    && /^HRLTR-\d{10,}-[a-z0-9]+$/i.test(incoming.id)
  if (isLegacyTravelLetter) {
    const linkedTravelRequestId = (incoming.payload as any)?.linkedTravelRequestId
    const alreadyMigrated = requestStore.getAll().find((item) =>
      item.module === "hr_travel_letter"
      && (item.payload as any)?.linkedTravelRequestId === linkedTravelRequestId
      && /^HRLTR-\d{4}-\d+$/.test(item.id)
    )
    const saved = alreadyMigrated ?? requestStore.create({
      ...requestToSave,
      clientRequestId: requestToSave.clientRequestId ?? incoming.id,
    })

    if (linkedTravelRequestId) {
      const travel = requestStore.get(linkedTravelRequestId)
      if (travel && (travel.payload as any)?.linkedHrLetterRequestId !== saved.id) {
        requestStore.upsert({
          ...travel,
          payload: { ...(travel.payload as any), linkedHrLetterRequestId: saved.id },
          updatedAt: new Date().toISOString(),
        })
      }
    }
    // The sequential record is the canonical replacement. Remove the old
    // timestamp-style record so the People HR Letter queue never shows the
    // same Travel letter twice.
    if (saved.id !== incoming.id) {
      requestStore.remove(incoming.id)
    }
    return NextResponse.json({ request: saved })
  }

  const saved = body.operation === "create"
    ? requestStore.create(requestToSave)
    : requestStore.upsert(requestToSave)

  logServerAudit({
    actor: session.user.name ?? session.user.email ?? "System",
    actorEmail: session.user.email ?? "",
    action: isNew ? "request_created" : "request_edited",
    targetId: saved.id,
    targetTitle: saved.title,
    details: isNew ? `${saved.module} request created` : `${saved.module} request updated`,
    category: "request",
    outcome: "success",
  })

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
    logServerAudit({ actor: session.user.name ?? session.user.email ?? "System", actorEmail: session.user.email ?? "", action: "request_deleted", targetId: moduleId, targetTitle: "Module requests deleted", details: `${all.length - remaining.length} ${moduleId} request(s) deleted`, category: "request", outcome: "success" })
    return NextResponse.json({ success: true, removed: all.length - remaining.length })
  }

  // No id and no module — wipe everything.
  if (!id) {
    requestStore.clear()
    logServerAudit({ actor: session.user.name ?? session.user.email ?? "System", actorEmail: session.user.email ?? "", action: "request_deleted", targetId: "", targetTitle: "All requests deleted", details: "All requests permanently deleted", category: "request", outcome: "success" })
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
  if (removed && toDelete) {
    logServerAudit({ actor: session.user.name ?? session.user.email ?? "System", actorEmail: session.user.email ?? "", action: "request_deleted", targetId: id, targetTitle: toDelete.title, details: `${toDelete.module} request permanently deleted`, category: "request", outcome: "success" })
  }
  return NextResponse.json({ success: removed })
}
