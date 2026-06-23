import { NextResponse } from "next/server"
import { getAllNotices } from "@/lib/noticeStore"

export const runtime = "nodejs"

/**
 * GET /api/notices — returns all system notices.
 * Public route — any signed-in user can read.
 */
export async function GET() {
  try {
    const notices = getAllNotices()
    return NextResponse.json({ data: notices })
  } catch (error) {
    console.error("Failed to read notices:", error)
    return NextResponse.json({ error: "Failed to read notices" }, { status: 500 })
  }
}
