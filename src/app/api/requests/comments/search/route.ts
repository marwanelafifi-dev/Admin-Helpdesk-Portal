import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { attachmentStore } from "@/lib/attachmentStore"
import { commentsStore } from "@/lib/commentsStore"
import { getVisibleRequestIds } from "@/lib/requestAccess"
import { textMatchesSearch } from "@/lib/utils"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const q = req.nextUrl.searchParams.get("q") ?? ""
    if (!q.trim()) return NextResponse.json({ requestIds: [] })
    const visibleRequestIds = getVisibleRequestIds(session.user)
    const matches = new Set([
      ...commentsStore.searchByTextOrAttachmentName(q),
      ...attachmentStore.getAll()
        .filter((attachment) => textMatchesSearch(attachment.fileName, q))
        .map((attachment) => attachment.requestId),
    ])
    const requestIds = [...matches].filter((id) => visibleRequestIds.has(id))
    return NextResponse.json({ requestIds })
  } catch (error) {
    console.error("GET /api/requests/comments/search error:", error)
    return NextResponse.json({ requestIds: [] })
  }
}
