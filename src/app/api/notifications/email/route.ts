import { NextRequest, NextResponse } from "next/server"
import { sendRequestUpdateEmail } from "@/lib/emailService"

type RequestUpdatePayload = {
  to?: string[]
  cc?: string[]
  updateType?: "status" | "comment" | "request_updated"
  requestId?: string
  requestTitle?: string
  module?: string
  actorName?: string
  preview?: string
  previousStatus?: string
  newStatus?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RequestUpdatePayload

    if (!body.requestId || !body.requestTitle || !body.module || !body.updateType) {
      return NextResponse.json(
        { error: "requestId, requestTitle, module, and updateType are required" },
        { status: 400 }
      )
    }

    const recipients = Array.isArray(body.to) ? body.to.filter(Boolean) : []
    if (recipients.length === 0) {
      return NextResponse.json({ data: { sent: false, reason: "No recipients" } })
    }

    await sendRequestUpdateEmail({
      to: recipients,
      cc: Array.isArray(body.cc) ? body.cc.filter(Boolean) : undefined,
      updateType: body.updateType,
      requestId: body.requestId,
      requestTitle: body.requestTitle,
      module: body.module,
      actorName: body.actorName,
      preview: body.preview,
      previousStatus: body.previousStatus,
      newStatus: body.newStatus,
    })

    return NextResponse.json({ data: { sent: true } })
  } catch (error) {
    console.error("POST /api/notifications/email error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send notification email" },
      { status: 500 }
    )
  }
}
