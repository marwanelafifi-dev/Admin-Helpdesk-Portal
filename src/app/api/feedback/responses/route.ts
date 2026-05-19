import { NextRequest, NextResponse } from "next/server"
import { feedbackStore } from "@/lib/feedbackStore"
import { auth } from "@/auth"

export const runtime = "nodejs"

// Auth-protected — used by Feedback & Reports dashboard.
export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 })
  }
  return NextResponse.json({ responses: feedbackStore.getResponses() })
}

// Auth-protected — Admin Database clear action.
export async function DELETE(_req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 })
  }
  feedbackStore.clearAll()
  return NextResponse.json({ cleared: true })
}
