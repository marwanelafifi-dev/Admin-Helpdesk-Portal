import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { canManageUsers, isSuperAdmin, hasPermission } from "@/lib/access"
import { readCompanyData, writeCompanyData, type CompanyDataShape } from "@/lib/companyDataServerStore"
import { logServerAudit } from "@/lib/serverAuditLog"

export const runtime = "nodejs"

/**
 * GET /api/company-data
 * Returns the shared company data lookup tables. Any signed-in user can
 * read — every module form uses these dropdowns.
 */
export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return NextResponse.json({ data: readCompanyData() })
}

/**
 * PUT /api/company-data
 * Body: full CompanyDataShape — replaces the stored data wholesale.
 * Only roles with `settings`, `page:admin-database`, or super-admin status
 * may write (matches the gate on the Admin → Company Data page).
 */
export async function PUT(req: Request) {
  const session = await auth()
  const perms = (session?.user?.permissions as string[] | undefined) ?? []
  const role = session?.user?.role
  const canEdit = isSuperAdmin(role)
    || hasPermission(perms, "settings")
    || hasPermission(perms, "page:admin-database")
    || hasPermission(perms, "page:admin-company-data")
    || canManageUsers(role, perms)
  if (!canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: Partial<CompanyDataShape> = {}
  try { body = await req.json() } catch { /* ignore */ }

  const before = readCompanyData()

  const next: CompanyDataShape = {
    suppliers:           Array.isArray(body.suppliers)           ? body.suppliers           : [],
    cost_centers:        Array.isArray(body.cost_centers)        ? body.cost_centers        : [],
    managers:            Array.isArray(body.managers)            ? body.managers            : [],
    authorized_managers: Array.isArray(body.authorized_managers) ? body.authorized_managers : [],
    carriers:            Array.isArray(body.carriers)            ? body.carriers            : [],
    departments:         Array.isArray(body.departments)         ? body.departments         : [],
    sectors:             Array.isArray(body.sectors)             ? body.sectors             : [],
  }

  writeCompanyData(next)

  // Diff each list and log one audit entry per changed section
  const LABELS: Record<keyof CompanyDataShape, string> = {
    suppliers:           "Suppliers",
    cost_centers:        "Cost Centers",
    managers:            "Managers",
    authorized_managers: "Authorized Managers",
    carriers:            "Carriers",
    departments:         "Departments",
    sectors:             "Sectors",
  }
  const actor = session?.user?.name ?? session?.user?.email ?? "Admin"
  const actorEmail = session?.user?.email ?? ""

  for (const key of Object.keys(LABELS) as (keyof CompanyDataShape)[]) {
    const beforeList = (before[key] as string[]).map((v) => typeof v === "string" ? v : (v as any).name ?? "")
    const afterList  = (next[key]   as string[]).map((v) => typeof v === "string" ? v : (v as any).name ?? "")
    const added   = afterList.filter((v) => !beforeList.includes(v))
    const removed = beforeList.filter((v) => !afterList.includes(v))
    if (added.length === 0 && removed.length === 0) continue

    const changes: string[] = []
    if (added.length > 0)   changes.push(`Added: ${added.join(", ")}`)
    if (removed.length > 0) changes.push(`Removed: ${removed.join(", ")}`)

    logServerAudit({
      actor,
      actorEmail,
      action: "company_data_updated",
      targetId: key,
      targetTitle: LABELS[key],
      details: changes.join(" | "),
      category: "user", // reuse "user" category so it shows under the User filter
    })
  }

  return NextResponse.json({ data: next })
}
