import { NextRequest, NextResponse } from "next/server"
import { syncInboundEmailReplies } from "@/lib/emailReplySync"

export const runtime = "nodejs"

function isAuthorized(req: NextRequest) {
  const secret = process.env.INBOUND_EMAIL_SECRET
  if (!secret) return true

  const authHeader = req.headers.get("authorization")
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : ""
  const headerSecret = req.headers.get("x-inbound-email-secret")
  return bearer === secret || headerSecret === secret
}

export async function POST(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const synced = await syncInboundEmailReplies()
    return NextResponse.json({
      data: {
        processed: synced.length,
        synced,
      },
    })
  } catch (error) {
    console.error("POST /api/email/sync error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to sync inbound email replies" },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  return POST(req)
}
