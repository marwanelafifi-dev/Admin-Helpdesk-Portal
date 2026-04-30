import { getToken } from "@auth/core/jwt"
import { NextRequest, NextResponse } from "next/server"

const publicRoutes = ["/login", "/unauthorized"]

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
