import { NextResponse } from "next/server"
import { auth } from "@/auth"

const publicRoutes = ["/login"]

export default auth((request) => {
  const { pathname } = request.nextUrl
  const isPublicRoute = publicRoutes.includes(pathname)

  if (!request.auth && !isPublicRoute) {
    const loginUrl = new URL("/login", request.nextUrl)
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.href)
    return NextResponse.redirect(loginUrl)
  }

  if (request.auth && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
}
