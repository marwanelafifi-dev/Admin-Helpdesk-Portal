import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { requestStore } from "@/lib/requestStore"
import { autoCreateHrLetterFromTravel } from "@/lib/hrLetterAutoCreate"

export const runtime = "nodejs"

/**
 * POST /api/requests/:id/create-hr-letter
 *
 * Client-side counterpart to the auto-creation that also runs inside the
 * manager email-approval route. Called from updateStatus() whenever a Travel
 * request is moved to "in_progress" from the UI (e.g. an admin manually
 * changing the status dropdown, not just the one-click email link) so both
 * paths behave identically. Idempotent — autoCreateHrLetterFromTravel() is a
 * no-op if the Travel request already has a linked HR Letter.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const request = requestStore.getAll().find((r) => r.id === id)
  if (!request) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 })
  }

  try {
    autoCreateHrLetterFromTravel(request)
  } catch (err) {
    console.error("Failed to create HR Letter:", err)
    return NextResponse.json({ error: "Failed to create HR Letter" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
