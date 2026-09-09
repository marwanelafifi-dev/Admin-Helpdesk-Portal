import { requestStore } from "@/lib/requestStore"
import type { EngineRequest } from "@/services/engineService"

/**
 * Auto-creates an HR Travel Letter request from an approved Travel request
 * that had "I need an HR Letter for this business trip" checked. Called from
 * both the manager email-approval route and the client-side updateStatus()
 * path (an admin can also move a Travel request to in_progress manually from
 * the status dropdown, not just via the email link).
 *
 * Idempotent: if the Travel request already has a linkedHrLetterRequestId,
 * this is a no-op — a Travel request can only spawn one HR Letter.
 */
export function autoCreateHrLetterFromTravel(request: EngineRequest): void {
  if (request.module !== "travel") return
  const payload = request.payload as any
  if (!payload?.needsHrLetter) return
  if (payload?.linkedHrLetterRequestId) return

  const now = new Date().toISOString()

  const hrLetterPayload = {
    linkedTravelRequestId: request.id,
    travelRequestCreatedAt: request.createdAt,
    travelRequestUpdatedAt: request.updatedAt,

    travelPurpose: payload.purposeOfTrip || "",
    destination: payload.destination || "",
    travelDateFrom: payload.dateFrom || "",
    travelDateTo: payload.dateTo || "",
    costCenter: payload.costCenter || "",
    directManagerName: payload.authorizedManager || "",

    passportAttachment: payload.passport || null,
    invitationLetterAttachment: payload.invitationLetter || null,
    letterPreparedBy: null,
    letterApprovedBy: null,
    letterContent: "",
    specialNotes: "",

    ccEmails: payload.ccEmails || [],
    attachments: [],
  }

  const hrLetter: EngineRequest = {
    id: `HRLTR-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    module: "hr_travel_letter",
    title: `HR Letter - ${request.title}`,
    status: "new",
    requesterId: request.requesterId,
    requesterName: request.requesterName,
    requesterEmail: request.requesterEmail,
    companyId: request.companyId,
    companyName: request.companyName,
    payload: hrLetterPayload,
    statusHistory: [
      { status: "new", changedBy: "System", changedAt: now, comment: "Auto-created from Travel request approval" },
    ],
    commentHistory: [],
    adminCc: [],
    createdAt: now,
    updatedAt: now,
  } as EngineRequest

  requestStore.upsert(hrLetter)

  // Link the HR Letter back onto the Travel request so this only ever fires once.
  const updatedTravel: EngineRequest = {
    ...request,
    payload: {
      ...payload,
      linkedHrLetterRequestId: hrLetter.id,
    },
    updatedAt: now,
  }
  requestStore.upsert(updatedTravel)

  fetch(`${process.env.NEXTAUTH_URL || "http://localhost:3003"}/api/notifications/new-hr-letter`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      hrLetterRequestId: hrLetter.id,
      travelRequestId: request.id,
      traveler: request.requesterName,
      destination: payload.destination,
    }),
  }).catch(() => {})
}
