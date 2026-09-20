import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { readAnnouncementStore } from "@/lib/announcementStore"
import type { IntranetOwner } from "@/lib/functionRegistry"

export const runtime = "nodejs"

const VALID_SCOPES: IntranetOwner[] = ["company", "admin"]

/**
 * GET /api/announcements/feed?scope=<company|admin>
 *
 * Announcements are Administration-owned. The company scope remains for
 * archived Intranet records; HR and Finance scopes are rejected.
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const scopeParam = new URL(req.url).searchParams.get("scope")
  if (scopeParam && !VALID_SCOPES.includes(scopeParam as IntranetOwner)) {
    return NextResponse.json({ error: "Announcement scope is not available" }, { status: 400 })
  }
  const scope = VALID_SCOPES.includes(scopeParam as IntranetOwner) ? (scopeParam as IntranetOwner) : null

  // Deduplicate by announcement ID (keep latest only)
  const store = readAnnouncementStore()
  const seenIds = new Set<string>()
  const deduped = store.sent.filter((announcement) => {
    if (seenIds.has(announcement.id)) return false
    seenIds.add(announcement.id)
    return true
  })

  const scoped = deduped.filter((announcement) => {
    const owner = announcement.owner ?? "company"
    return scope ? owner === scope : VALID_SCOPES.includes(owner)
  })

  const sent = scoped
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
