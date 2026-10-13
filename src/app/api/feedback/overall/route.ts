import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { feedbackStore } from "@/lib/feedbackStore"
import { requestStore } from "@/lib/requestStore"
import { functionForModule } from "@/lib/functionRegistry"
import { loadSettingsServer } from "@/lib/settingsServer"

export const runtime = "nodejs"

/** Submit one satisfaction response that covers the caller's completed requests. */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => null) as { requestIds?: unknown; rating?: unknown; comment?: unknown } | null
  const rating = Number(body?.rating)
  const requestIds = Array.from(new Set(
    Array.isArray(body?.requestIds)
      ? body.requestIds.filter((id): id is string => typeof id === "string").map((id) => id.trim()).filter(Boolean)
      : [],
  ))
  const comment = typeof body?.comment === "string" ? body.comment.trim().slice(0, 4_000) : ""

  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || requestIds.length === 0 || requestIds.length > 200) {
    return NextResponse.json({ error: "Invalid overall feedback submission." }, { status: 400 })
  }

  const requesterEmail = session.user.email.trim().toLowerCase()
  const completedResponses = feedbackStore.getResponses()
  const individualFeedbackIds = new Set(
    completedResponses
      .filter((response) => response.feedbackScope !== "overall")
      .map((response) => response.requestId),
  )
  const alreadyCoveredIds = new Set(
    completedResponses
      .filter((response) => response.feedbackScope === "overall" && response.requesterEmail.trim().toLowerCase() === requesterEmail)
      .flatMap((response) => response.coveredRequestIds ?? []),
  )

  const requests = requestIds
    .map((id) => requestStore.get(id))
    .filter((request): request is NonNullable<typeof request> => Boolean(request))
    .filter((request) => {
      const ownsRequest = request.requesterId === session.user.id
        || request.requesterEmail.trim().toLowerCase() === requesterEmail
      const isComplete = request.status === "completed" || request.status === "delivered"
      return ownsRequest && isComplete && !individualFeedbackIds.has(request.id) && !alreadyCoveredIds.has(request.id)
    })

  if (requests.length === 0) {
    return NextResponse.json({ error: "There are no completed requests awaiting overall feedback." }, { status: 409 })
  }

  const functionId = functionForModule(requests[0].module)
  if (requests.some((request) => functionForModule(request.module) !== functionId)) {
    return NextResponse.json({ error: "Overall feedback must cover requests from one support function." }, { status: 400 })
  }
  if (!loadSettingsServer().feedbackSurveysByFunction[functionId].enabled) {
    return NextResponse.json({ error: "Feedback surveys are disabled for this function." }, { status: 403 })
  }

  const response = feedbackStore.createOverallResponse({
    requesterEmail,
    requesterName: session.user.name?.trim() || requests[0].requesterName || "Unknown User",
    functionId,
    coveredRequestIds: requests.map((request) => request.id),
    rating,
    comment,
  })

  return NextResponse.json({ response, coveredRequestIds: response.coveredRequestIds })
}
