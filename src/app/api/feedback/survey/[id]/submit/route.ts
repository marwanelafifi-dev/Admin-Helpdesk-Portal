import { NextRequest, NextResponse } from "next/server"
import { feedbackStore } from "@/lib/feedbackStore"

export const runtime = "nodejs"

// Public — submitting feedback by survey id (from the email link).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let body: { rating?: number; comment?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }

  const rating = Number(body.rating)
  const comment = typeof body.comment === "string" ? body.comment : ""

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "invalid_rating" }, { status: 400 })
  }

  const response = feedbackStore.submitResponse(id, rating, comment)
  if (!response) {
    return NextResponse.json({ error: "not_found_or_already_completed" }, { status: 404 })
  }
  return NextResponse.json({ response })
}
