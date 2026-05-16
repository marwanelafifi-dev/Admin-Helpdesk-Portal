import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import { can, isRestricted } from "@/lib/permissions"
import { isMaintenanceModeEnabled } from "@/lib/maintenance-mode"
import { rateLimit } from "@/lib/rate-limit"

const MAINTENANCE_PAGE = "/maintenance"

function checkAccess(pathname: string, role: string): boolean {
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return can(role, "dashboard")
  }

  if (pathname === "/admin/all-requests" || pathname.startsWith("/admin/all-requests/")) {
    return can(role, "allRequests")
  }

  if (pathname === "/analytics" || pathname.startsWith("/analytics/")) {
    return can(role, "analytics")
  }

  if (pathname === "/hr/new" || pathname.startsWith("/hr/new/") || pathname === "/hr/edit" || pathname.startsWith("/hr/edit/")) {
    return can(role, "hrCreate")
  }

  if (pathname === "/hr" || pathname.startsWith("/hr/")) {
    return can(role, "hrModule")
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return can(role, "adminPanel")
  }

  return true
}

function fallback(role: string): string {
  return isRestricted(role) ? "/requests" : "/dashboard"
}

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token
    const role = (token?.role as string) || "viewer"

    // Rate-limit all API routes except NextAuth callbacks
    if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth/")) {
      const limited = rateLimit(req)
      if (limited) return limited
    }

    // API routes handle their own auth via getServerSession — skip page logic
    if (pathname.startsWith("/api/")) return

    if (isMaintenanceModeEnabled()) {
      const isMaintenanceRoute = pathname === MAINTENANCE_PAGE
      const isSuperAdmin = role === "super_admin"

      if (!isMaintenanceRoute && !isSuperAdmin) {
        return NextResponse.redirect(new URL(MAINTENANCE_PAGE, req.url))
      }
    }

    if (pathname === "/login" && token) {
      return NextResponse.redirect(new URL(fallback(token.role as string), req.url))
    }

    if (!token) return

    if (!checkAccess(pathname, role)) {
      return NextResponse.redirect(new URL(fallback(role), req.url))
    }
  },
  {
    callbacks: {
      authorized({ token, req }) {
        const { pathname } = req.nextUrl
        // API routes and public pages bypass token check here
        if (pathname.startsWith("/api/")) return true
        if (pathname === "/login" || pathname === MAINTENANCE_PAGE) return true
        return !!token
      },
    },
    pages: { signIn: "/login" },
  }
)

export const config = {
  // Include API routes (for rate limiting) but keep static assets excluded
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
}
