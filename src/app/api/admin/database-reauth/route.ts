import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { getToken } from "@auth/core/jwt"
import { auth } from "@/auth"
import { findUserByEmail, findUserById } from "@/lib/userStore"
import { DATABASE_REAUTH_COOKIE, issueDatabaseReauth, verifyDatabaseReauth } from "@/lib/databaseReauth"
import { logServerAudit } from "@/lib/serverAuditLog"
import { requestMetadata } from "@/lib/databaseAccess"

export const runtime = "nodejs"

function cookieOptions(maxAge: number, secure: boolean) {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure,
    path: "/api/admin",
    maxAge,
  }
}

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ verified: false }, { status: 401 })
  return NextResponse.json({ verified: verifyDatabaseReauth(request, session.user) })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || !session.user.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const actor = session.user.name ?? session.user.email
  const audit = (outcome: "success" | "failure" | "denied", details: string) => logServerAudit({
    actor,
    actorEmail: session.user.email ?? "",
    action: "database_reauthenticated",
    targetId: session.user.id ?? "",
    targetTitle: "Database destructive operation",
    details,
    category: "database",
    outcome,
    ...requestMetadata(request),
  })

  const body = await request.json().catch(() => ({})) as { password?: unknown; sso?: unknown }
  const fileUser = findUserById(session.user.id) ?? findUserByEmail(session.user.email)

  if (fileUser?.provider === "credentials" || fileUser?.passwordHash) {
    if (typeof body.password !== "string" || !body.password) {
      audit("denied", "Database reauthentication denied: current password is required.")
      return NextResponse.json({ error: "Enter your current password to continue." }, { status: 400 })
    }
    if (!fileUser.passwordHash || !await bcrypt.compare(body.password, fileUser.passwordHash)) {
      audit("failure", "Database reauthentication failed: password did not match.")
      return NextResponse.json({ error: "The current password is incorrect." }, { status: 401 })
    }
  } else {
    // SSO accounts cannot and should not submit their identity-provider
    // password to this portal. Accept only a brand-new corporate sign-in.
    if (body.sso !== true) {
      audit("denied", "Database reauthentication denied: recent corporate SSO sign-in is required.")
      return NextResponse.json({ error: "Sign out and sign in with your corporate account, then verify the recent sign-in here." }, { status: 400 })
    }
    const token = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
      secureCookie: request.nextUrl.protocol === "https:",
    })
    const issuedAt = Number((token as any)?.issuedAtSec ?? token?.iat ?? 0)
    if (!issuedAt || Math.floor(Date.now() / 1000) - issuedAt > 5 * 60) {
      audit("denied", "Database reauthentication denied: corporate SSO sign-in was not recent.")
      return NextResponse.json({ error: "Your corporate sign-in is not recent enough. Sign out and sign in again, then retry within five minutes." }, { status: 401 })
    }
  }

  const issued = issueDatabaseReauth(session.user)
  const response = NextResponse.json({ verified: true, expiresAt: issued.expiresAt })
  response.cookies.set(DATABASE_REAUTH_COOKIE, issued.token, cookieOptions(issued.maxAge, request.nextUrl.protocol === "https:"))
  audit("success", "Database reauthentication completed; valid for 10 minutes.")
  return response
}
