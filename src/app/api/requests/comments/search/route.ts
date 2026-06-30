import { NextRequest, NextResponse } from "next/server"
import { commentsStore } from "@/lib/commentsStore"

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q") ?? ""
    if (!q.trim()) return NextResponse.json({ requestIds: [] })
    const requestIds = commentsStore.searchByContent(q)
    return NextResponse.json({ requestIds })
  } catch (error) {
    console.error("GET /api/requests/comments/search error:", error)
    return NextResponse.json({ requestIds: [] })
  }
}
