import { NextRequest, NextResponse } from "next/server"
import { syncInboundEmailReplies } from "@/lib/emailReplySync"

export const runtime = "nodejs"
export const maxDuration = 60

// Called by the Docker cron job every 5 minutes to pull email replies into comments
export async function GET(req: NextRequest) {
  try {
    const secret = process.env.INBOUND_EMAIL_SECRET
    if (secret) {
      const authHeader = req.headers.get("authorization")
      const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : ""
      const headerSecret = req.headers.get("x-cron-secret")
      if (bearer !== secret && headerSecret !== secret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    const synced = await syncInboundEmailReplies()

    const added = synced.filter((r) => r.status === "comment_added")
    const duplicates = synced.filter((r) => r.status === "duplicate")
    const skipped = synced.filter((r) => r.status === "skipped")

    console.info("[email-cron] Sync complete", {
      total: synced.length,
      added: added.length,
      duplicates: duplicates.length,
      skipped: skipped.length,
    })

    return NextResponse.json({
      ok: true,
      summary: {
        total: synced.length,
        added: added.length,
        duplicates: duplicates.length,
        skipped: skipped.length,
      },
      results: synced,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[email-cron] Sync failed:", message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
