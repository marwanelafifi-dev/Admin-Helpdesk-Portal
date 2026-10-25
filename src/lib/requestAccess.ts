import { requestStore } from "@/lib/requestStore"
import { isRequestVisibleToViewer } from "@/lib/functionRegistry"
import { getCompanyFromEmail, getRequestCompany } from "@/lib/userCompany"
import { scopeRequestsByModuleAccess, type UserWithModuleAccess } from "@/lib/access"
import type { EngineRequest } from "@/services/engineService"

type Viewer = {
  id?: string | null
  role?: string | null
  email?: string | null
  name?: string | null
  permissions?: string[]
  readModules?: string[]
  readAllModules?: string[]
}

function classifyCompany(request: EngineRequest): EngineRequest {
  const company = getRequestCompany(request.module, request.requesterEmail)
  return {
    ...request,
    companyId: request.companyId ?? company?.id,
    companyName: request.companyName ?? company?.name,
  }
}

/**
 * The canonical server-side request scope used by search and request
 * subresources. Keeping it here prevents a search endpoint from becoming an
 * information side-channel for records hidden by module, company, requester,
 * or CC-recipient access rules.
 */
export function getVisibleRequestIds(viewer: Viewer): Set<string> {
  const userWithModules: UserWithModuleAccess = {
    id: viewer.id ?? undefined,
    email: viewer.email ?? undefined,
    name: viewer.name ?? undefined,
    role: viewer.role ?? undefined,
    readModules: viewer.readModules as UserWithModuleAccess["readModules"],
    readAllModules: viewer.readAllModules as UserWithModuleAccess["readAllModules"],
  }
  const isBuchiViewer = viewer.role?.toLowerCase().includes("buchi")
    || getCompanyFromEmail(viewer.email)?.id === "buchi"
  const classified = requestStore.getAll().map(classifyCompany)
  const companyScoped = isBuchiViewer
    ? scopeRequestsByModuleAccess(classified, userWithModules, viewer)
    : classified

  return new Set(companyScoped
    .filter((request) => isRequestVisibleToViewer({
      moduleId: request.module,
      role: viewer.role,
      permissions: viewer.permissions ?? [],
      readAllModules: viewer.readAllModules ?? [],
      viewerEmail: viewer.email,
      requesterEmail: request.requesterEmail,
      ccEmails: [
        ...(Array.isArray((request.payload as any)?.ccEmails) ? (request.payload as any).ccEmails : []),
        ...(Array.isArray(request.adminCc) ? request.adminCc : []),
      ],
    }))
    .map((request) => request.id))
}

/** Server-side gate for request subresources such as attachments. */
export function canAccessRequest(viewer: Viewer, requestId: string): boolean {
  return getVisibleRequestIds(viewer).has(requestId)
}
