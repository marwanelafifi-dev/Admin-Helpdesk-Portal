import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getFirstAllowedPath } from "@/lib/access"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const session = await auth()

  if (!session?.user) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", "/landing")
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.redirect(new URL(getFirstAllowedPath(session.user.permissions, session.user.role), request.url))
}
