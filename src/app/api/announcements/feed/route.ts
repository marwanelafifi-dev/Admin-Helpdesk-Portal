import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { readAnnouncementStore } from "@/lib/announcementStore"

export const runtime = "nodejs"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const sent = readAnnouncementStore().sent
    .slice()
    .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
    .map((announcement) => ({
      id: announcement.id,
      subject: announcement.subject,
      body: announcement.body,
      signature: announcement.signature,
      attachments: announcement.attachments ?? [],
      createdBy: announcement.createdBy,
      sentAt: announcement.sentAt,
      recipientCount: announcement.recipientCount,
    }))

  return NextResponse.json({ announcements: sent })
}
