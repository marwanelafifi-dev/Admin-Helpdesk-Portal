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
  "/admin/users": "page:admin-users",
  "/admin/settings": "page:admin-settings",
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublicRoute = publicRoutes.includes(pathname)
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    secureCookie: request.nextUrl.protocol === "https:",
  })

  if (!token && !isPublicRoute) {
    const loginUrl = new URL("/login", request.nextUrl)
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.href)
    return NextResponse.redirect(loginUrl)
  }

  if (token && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.nextUrl))
  }

  // Check permissions for protected pages
  if (token && pagePermissions[pathname]) {
    const requiredPermission = pagePermissions[pathname]
    const userPermissions = (token.permissions as string[]) || []
    const role = token.role as string | undefined

    const isSuperAdmin = role === "super_admin"
    const hasWildcard = userPermissions.includes("*")
    const hasPermission = userPermissions.includes(requiredPermission)

    if (!isSuperAdmin && !hasWildcard && !hasPermission) {
      return NextResponse.redirect(new URL("/unauthorized", request.nextUrl))
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
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
}
