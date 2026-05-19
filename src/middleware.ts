import { getToken } from "@auth/core/jwt"
import { NextRequest, NextResponse } from "next/server"

const publicRoutes = ["/login", "/unauthorized", "/feedback-survey"]

const pagePermissions: Record<string, string> = {
  "/dashboard": "page:dashboard",
  "/feedback-reports": "page:feedback-reports",
  "/tasks": "page:tasks",
  "/admin/all-requests": "page:all-requests",
  "/requests": "page:my-requests",
  "/shipping": "page:shipping",
  "/shipping/new": "page:shipping-new",
  "/shipping/sending": "page:shipping-sending",
  "/shipping/receiving": "page:shipping-receiving",
  "/hr": "page:hr",
  "/hr/new": "page:hr-new",
  "/maintenance": "page:maintenance",
  "/maintenance/new": "page:maintenance-new",
  "/purchase": "page:purchase",
  "/purchase/new": "page:purchase-new",
  "/event": "page:event",
  "/travel": "page:travel",
  "/general": "page:general",
  "/general/new": "page:general-new",
  "/admin/users": "page:admin-users",
  "/admin/roles": "page:admin-roles",
  "/admin/settings": "page:admin-settings",
  "/admin/audit-trail": "page:admin-audit",
  "/admin/database": "page:admin-database",
  "/admin/company-data": "page:admin-database",
  "/admin/notifications": "page:admin-notifications",
}

// Build redirect URLs from the public base URL instead of request.nextUrl,
// so Cloudflare Tunnel deployments (where the inbound Host header is the
// internal docker hostname) don't leak "localhost:3003" into Location headers.
function getPublicBase(request: NextRequest): URL {
  const configured = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL
  if (configured) {
    try { return new URL(configured) } catch { /* fall through */ }
  }
  return new URL(request.nextUrl.origin)
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (pathname.startsWith("/api/email/")) {
    return NextResponse.next()
  }
  const publicBase = getPublicBase(request)

  const isPublicRoute = publicRoutes.includes(pathname)
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    secureCookie: request.nextUrl.protocol === "https:",
  })

  if (!token && !isPublicRoute) {
    const loginUrl = new URL("/login", publicBase)
    // callbackUrl uses the path only — never the full request.nextUrl.href,
    // which would carry the wrong host through the auth round-trip.
    loginUrl.searchParams.set("callbackUrl", pathname + request.nextUrl.search)
    return NextResponse.redirect(loginUrl)
  }

  if (token && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", publicBase))
  }

  // Check permissions for protected pages
  if (token && pagePermissions[pathname]) {
    const requiredPermission = pagePermissions[pathname]
    const userPermissions = (token.permissions as string[]) || []
    const role = token.role as string | undefined

    const isSuperAdmin = role === "super_admin" || role === "Full Access"
    const hasWildcard = userPermissions.includes("*")
    const hasPermission = userPermissions.includes(requiredPermission)

    if (!isSuperAdmin && !hasWildcard && !hasPermission) {
      return NextResponse.redirect(new URL("/unauthorized", publicBase))
    }
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-pathname", pathname)

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
}
