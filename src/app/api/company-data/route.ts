import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { canManageUsers, isSuperAdmin, hasPermission } from "@/lib/access"
import { readCompanyData, writeCompanyData, type CompanyDataShape } from "@/lib/companyDataServerStore"

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

  const next: CompanyDataShape = {
    suppliers:    Array.isArray(body.suppliers)    ? body.suppliers    : [],
    cost_centers: Array.isArray(body.cost_centers) ? body.cost_centers : [],
    managers:     Array.isArray(body.managers)     ? body.managers     : [],
    carriers:     Array.isArray(body.carriers)     ? body.carriers     : [],
    departments:  Array.isArray(body.departments)  ? body.departments  : [],
    sectors:      Array.isArray(body.sectors)      ? body.sectors      : [],
  }

  writeCompanyData(next)
  return NextResponse.json({ data: next })
}
