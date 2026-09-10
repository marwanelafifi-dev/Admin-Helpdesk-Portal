import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { canManageIntranetContent } from "@/lib/functionRegistry"
import { createQuickLink, getAllQuickLinks, type IntranetOwner } from "@/lib/quickLinksStore"

export const runtime = "nodejs"

const VALID_OWNERS: IntranetOwner[] = ["company", "admin", "hr", "finance"]

/** GET /api/quick-links — any signed-in user, full list (read is company-wide). */
export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return NextResponse.json({ data: getAllQuickLinks() })
}

/** POST /api/quick-links — create a link. Only the owning team (or Full Access) may create it. */
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body.title !== "string" || typeof body.url !== "string") {
    return NextResponse.json({ error: "title and url are required" }, { status: 400 })
  }

  const owner: IntranetOwner = VALID_OWNERS.includes(body.owner) ? body.owner : "company"
  if (!canManageIntranetContent(owner, session.user.role, (session.user as any).intranetOwners)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const link = createQuickLink({
    title: body.title.trim(),
    description: typeof body.description === "string" ? body.description.trim() || undefined : undefined,
    url: body.url.trim(),
    icon: typeof body.icon === "string" ? body.icon : undefined,
    owner,
    createdBy: session.user.name || session.user.email || "Unknown",
    createdByEmail: session.user.email || "",
  })

  return NextResponse.json({ data: link }, { status: 201 })
}
