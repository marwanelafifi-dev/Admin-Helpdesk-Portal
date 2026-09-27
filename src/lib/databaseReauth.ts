import crypto from "crypto"
import type { NextRequest } from "next/server"

export const DATABASE_REAUTH_COOKIE = "arp_database_reauth"
const PURPOSE = "database-destructive-operation"
const TTL_SECONDS = 10 * 60

type DatabaseReauthClaims = {
  purpose: typeof PURPOSE
  userId: string
  email: string
  exp: number
}

function secret() {
  const value = process.env.DATABASE_REAUTH_SECRET ?? process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET
  if (!value) throw new Error("A database reauthentication secret is required")
  return value
}

function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url")
}

function sign(payload: string) {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url")
}

function timingSafeEqual(left: string, right: string) {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export function issueDatabaseReauth(user: { id?: string | null; email?: string | null }) {
  if (!user.id || !user.email) throw new Error("An authenticated user is required")
  const claims: DatabaseReauthClaims = {
    purpose: PURPOSE,
    userId: user.id,
    email: user.email.toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + TTL_SECONDS,
  }
  const payload = base64Url(JSON.stringify(claims))
  return { token: `${payload}.${sign(payload)}`, expiresAt: new Date(claims.exp * 1000).toISOString(), maxAge: TTL_SECONDS }
}

export function verifyDatabaseReauth(request: NextRequest, user: { id?: string | null; email?: string | null }) {
  const token = request.cookies.get(DATABASE_REAUTH_COOKIE)?.value
  if (!token || !user.id || !user.email) return { valid: false, expiresAt: null }
  const [payload, signature, ...extra] = token.split(".")
  if (!payload || !signature || extra.length || !timingSafeEqual(sign(payload), signature)) return { valid: false, expiresAt: null }
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<DatabaseReauthClaims>
    const now = Math.floor(Date.now() / 1000)
    const valid = claims.purpose === PURPOSE
      && claims.userId === user.id
      && claims.email === user.email.toLowerCase()
      && typeof claims.exp === "number"
      && claims.exp > now
    return { valid, expiresAt: valid ? new Date(claims.exp! * 1000).toISOString() : null }
  } catch {
    return { valid: false, expiresAt: null }
  }
}
