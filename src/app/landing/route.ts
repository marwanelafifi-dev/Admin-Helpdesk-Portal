import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getFirstAllowedPath } from "@/lib/access"

export const runtime = "nodejs"

// Build absolute redirect targets from the configured public URL rather than
// request.url, because behind a reverse proxy (Cloudflare Tunnel) the Host
// header reaching Next.js is the internal hostname (e.g. localhost:3003),
// which would otherwise leak into the Location header. Using the configured
// NEXTAUTH_URL / AUTH_URL keeps redirects pointing at the public domain.
function getBaseUrl(request: Request): string {
  return (
    process.env.NEXTAUTH_URL ??
    process.env.AUTH_URL ??
    new URL(request.url).origin
  )
}

export async function GET(request: Request) {
  const baseUrl = getBaseUrl(request)
  const session = await auth()

  if (!session?.user) {
    const loginUrl = new URL("/login", baseUrl)
    loginUrl.searchParams.set("callbackUrl", "/landing")
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.redirect(new URL(getFirstAllowedPath(session.user.permissions, session.user.role), baseUrl))
}
