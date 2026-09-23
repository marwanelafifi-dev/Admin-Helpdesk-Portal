import { requestStore } from "@/lib/requestStore"
import { isRequestVisibleToViewer } from "@/lib/functionRegistry"

type Viewer = {
  role?: string | null
  email?: string | null
  permissions?: string[]
  readAllModules?: string[]
}

/** Server-side gate for request subresources such as attachments. */
export function canAccessRequest(viewer: Viewer, requestId: string): boolean {
  const request = requestStore.get(requestId)
  if (!request) return false

  return isRequestVisibleToViewer({
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
  })
}
