import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

const ADMIN_ROLES = ["super_admin", "admin", "manager"]

function checkAccess(pathname: string, role: string): boolean {
  // Admin panel (users/roles/settings) — super_admin only
  if (
    pathname.startsWith("/admin/users") ||
    pathname.startsWith("/admin/roles") ||
    pathname.startsWith("/admin/settings")
  ) return role === "super_admin"

  // HR create/edit — super_admin and manager only (admin excluded)
  if (pathname.startsWith("/hr/new") || pathname.startsWith("/hr/edit"))
    return role === "super_admin" || role === "manager"

  // HR, Dashboard, All Requests — admin roles only
  if (
    pathname === "/dashboard" ||
    pathname.startsWith("/hr") ||
    pathname.startsWith("/admin/all-requests")
  ) return ADMIN_ROLES.includes(role)

  return true // all authenticated users
}

function fallback(role: string): string {
  return role === "employee" || role === "external" ? "/requests" : "/dashboard"
}

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // Redirect authenticated users away from /login
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
