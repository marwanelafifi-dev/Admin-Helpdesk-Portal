import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import { can, isRestricted } from "@/lib/permissions"

function checkAccess(pathname: string, role: string): boolean {
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return can(role, "dashboard")
  }

  if (pathname === "/admin/all-requests" || pathname.startsWith("/admin/all-requests/")) {
    return can(role, "allRequests")
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

    if (pathname === "/login" && token) {
      return NextResponse.redirect(new URL(fallback(token.role as string), req.url))
    }

    if (!token) return

    const role = token.role as string
    if (!checkAccess(pathname, role)) {
      return NextResponse.redirect(new URL(fallback(role), req.url))
    }
  },
  {
    callbacks: {
      authorized({ token, req }) {
        if (req.nextUrl.pathname === "/login") return true
        return !!token
      },
    },
    pages: { signIn: "/login" },
  }
)

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon\\.ico).*)"],
}
