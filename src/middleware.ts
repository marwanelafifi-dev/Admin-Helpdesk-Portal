import { getToken } from "@auth/core/jwt"
import { NextRequest, NextResponse } from "next/server"
import { PAGE_PERMISSIONS_BY_PATH } from "@/lib/pageRegistry"

const publicRoutes = ["/login", "/unauthorized", "/feedback-survey", "/system-maintenance"]

// Sourced from the central page registry — adding a page in pageRegistry.ts
// auto-wires its middleware gate (and the Admin > Roles checkbox).
const pagePermissions: Record<string, string> = PAGE_PERMISSIONS_BY_PATH

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

  // Stale session — admin force-signed-out and this token was issued
  // before the cutoff. Bounce through NextAuth's signout flow so the
  // cookie is cleared properly, then back to /login. Without this the
  // user gets stuck in a loop because the cookie itself is still valid
  // (just marked stale by us).
  if (token && (token as any).stale === true && !isPublicRoute && pathname !== "/api/auth/signout") {
    const signoutUrl = new URL("/api/auth/signout", publicBase)
    signoutUrl.searchParams.set("callbackUrl", "/login")
    return NextResponse.redirect(signoutUrl)
  }

  if (token && pathname === "/login") {
    // If the token is stale, allow them through to login so they can sign in fresh.
    if ((token as any).stale === true) {
      return NextResponse.next()
    }
    return NextResponse.redirect(new URL("/dashboard", publicBase))
  }

  // Maintenance mode — block every dashboard route for non-admins. Full
  // Access users keep access so they can flip the flag back off. The
  // flag is stamped on the token by the auth jwt callback.
  if (token && (token as any).maintenance === true && !isPublicRoute) {
    const role = token.role as string | undefined
    const userPermissions = (token.permissions as string[]) || []
    const isAdminish =
      role === "super_admin" ||
      role === "Full Access" ||
      userPermissions.includes("*")
    if (!isAdminish) {
      return NextResponse.redirect(new URL("/system-maintenance", publicBase))
    }
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
