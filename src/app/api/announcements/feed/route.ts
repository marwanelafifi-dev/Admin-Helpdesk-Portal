import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { readAnnouncementStore } from "@/lib/announcementStore"
import type { IntranetOwner } from "@/lib/functionRegistry"

export const runtime = "nodejs"

const VALID_SCOPES: IntranetOwner[] = ["company", "admin", "hr", "finance"]

/**
 * GET /api/announcements/feed?scope=<company|admin|hr|finance>
 *
 * Each portal's read feed is fully standalone — it only shows announcements
 * whose owner exactly matches its own scope. Admin Portal shows admin-owned
 * only, HR Portal shows hr-owned only, Finance Portal shows finance-owned
 * only, and the Intranet's own feed shows company-owned only. None of them
 * aggregate another function's announcements. Omitting `scope` returns
 * every announcement regardless of owner — used only by the global
 * notification-bell hook, which intentionally needs company-wide awareness.
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const scopeParam = new URL(req.url).searchParams.get("scope")
  const scope = VALID_SCOPES.includes(scopeParam as IntranetOwner) ? (scopeParam as IntranetOwner) : null

  // Deduplicate by announcement ID (keep latest only)
  const store = readAnnouncementStore()
  const seenIds = new Set<string>()
  const deduped = store.sent.filter((announcement) => {
    if (seenIds.has(announcement.id)) return false
    seenIds.add(announcement.id)
    return true
  })

  const scoped = scope
    ? deduped.filter((announcement) => (announcement.owner ?? "company") === scope)
    : deduped

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
