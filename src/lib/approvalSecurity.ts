import { logServerAudit } from "@/lib/serverAuditLog"

export function logApprovalAttempt(params: {
  req: Request
  requestId: string
  requestTitle?: string
  action: "approve" | "reject"
  actorEmail?: string
  outcome: "success" | "failure" | "denied"
  details: string
  opened?: boolean
}) {
  const forwardedFor = params.req.headers.get("x-forwarded-for")
  const ipAddress = forwardedFor?.split(",")[0]?.trim()
    || params.req.headers.get("x-real-ip")
    || ""
  logServerAudit({
    actor: params.actorEmail || "Unknown",
    actorEmail: params.actorEmail || "",
    action: params.opened ? "approval_link_opened"
      : params.action === "approve" && params.outcome === "success" ? "approval_approved"
      : params.action === "reject" && params.outcome === "success" ? "approval_rejected"
      : "access_denied",
    targetId: params.requestId,
    targetTitle: params.requestTitle || "Approval link",
    details: `${params.action}: ${params.details}`,
    category: params.outcome === "success" ? "request" : "access",
    outcome: params.outcome,
    path: new URL(params.req.url).pathname,
    ipAddress,
    userAgent: params.req.headers.get("user-agent") || "",
  })
}
