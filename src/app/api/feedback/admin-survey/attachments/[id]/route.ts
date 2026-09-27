import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { adminSurveyStore } from "@/lib/adminSurveyStore"

export const runtime = "nodejs"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const [surveyId, attachmentId] = id.split("--")
  if (!surveyId || !attachmentId) return NextResponse.json({ error: "Invalid attachment ID format" }, { status: 400 })
  const survey = adminSurveyStore.getById(surveyId)
  if (!survey) return NextResponse.json({ error: "Feedback item not found" }, { status: 404 })
  const isOwner = survey.userEmail.toLowerCase() === (session.user.email || "").toLowerCase()
  const isAdmin = session.user.role === "Full Access"
  if (!isOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const attachment = survey.attachments?.find((item) => item.id === attachmentId)
  if (!attachment?.url.startsWith("data:")) return NextResponse.json({ error: "Attachment not found" }, { status: 404 })
  const [header, encoded] = attachment.url.split(",")
  const mimeType = header.match(/:(.*?);/)?.[1] || attachment.type
  const buffer = Buffer.from(encoded, "base64")
  return new NextResponse(buffer, { headers: { "Content-Type": mimeType, "Content-Length": String(buffer.length), "Content-Disposition": `attachment; filename="${attachment.name}"` } })
}
