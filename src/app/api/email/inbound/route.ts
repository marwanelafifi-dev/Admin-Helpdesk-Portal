import { NextRequest, NextResponse } from "next/server"
import { addInboundEmailReplyAsComment, type InboundEmailPayload } from "@/lib/inboundEmail"

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

    const payload = (await req.json()) as InboundEmailPayload
    const result = addInboundEmailReplyAsComment(payload)

    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 400 })
    }

    return NextResponse.json({
      data: {
        requestId: result.requestId,
        comment: result.comment,
      },
    })
  } catch (error) {
    console.error("POST /api/email/inbound error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process inbound email" },
      { status: 500 }
    )
  }
}
