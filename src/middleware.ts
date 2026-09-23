import { getToken } from "@auth/core/jwt"
import { NextRequest, NextResponse } from "next/server"
import { permissionForPath } from "@/lib/access"

const publicRoutes = ["/login", "/unauthorized", "/feedback-survey", "/system-maintenance"]

// These endpoints have their own authentication mechanism (NextAuth, signed
// email/approval links, or a deliberately public maintenance/survey view).
// Every other API endpoint requires a valid session at the edge, preventing
// accidental exposure when a route handler forgets an auth() check.
function isPublicApi(pathname: string) {
  return (
    pathname.startsWith("/api/auth/") ||
    pathname === "/api/email/inbound" ||
    pathname === "/api/email/sync" ||
    pathname === "/api/email/sync/cron" ||
    pathname === "/api/maintenance/scheduled" ||
    /^\/api\/feedback\/survey\/[^/]+(?:\/submit)?$/.test(pathname) ||
    /^\/api\/requests\/[^/]+\/(approve|reject)$/.test(pathname)
  )
}

// Sourced from the central page registry — adding a page in pageRegistry.ts
// auto-wires its middleware gate (and the Admin > Roles checkbox).

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
  const publicBase = getPublicBase(request)

  const isApiRoute = pathname.startsWith("/api/")
  const isPublicRoute = publicRoutes.includes(pathname) || (isApiRoute && isPublicApi(pathname))
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    secureCookie: request.nextUrl.protocol === "https:",
  })

  if (!token && !isPublicRoute) {
    if (isApiRoute) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
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
    return NextResponse.redirect(new URL("/landing", publicBase))
  }

  // Credential users with a temporary password may only access Account
  // Settings until they complete the required first-login password change.
  if (
    token
    && (token as any).mustChangePassword === true
    && !isPublicRoute
    && pathname !== "/account/settings"
  ) {
    return NextResponse.redirect(new URL("/account/settings", publicBase))
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
  const requiredPermission = permissionForPath(pathname)
  if (token && requiredPermission) {
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
