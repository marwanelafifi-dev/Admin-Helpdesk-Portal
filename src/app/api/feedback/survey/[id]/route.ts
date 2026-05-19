import { NextRequest, NextResponse } from "next/server"
import { feedbackStore } from "@/lib/feedbackStore"

export const runtime = "nodejs"

// Public — anyone with the survey id (from the email link) can read it.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const survey = feedbackStore.findSurvey(id)
  if (!survey) {
    return NextResponse.json({ error: "not_found" }, { status: 404 })
  }
  return NextResponse.json({ survey })
}
