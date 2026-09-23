import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { getPermissionsForRole } from "@/lib/userRoles"
import { upsertGoogleUser, findUserByEmail } from "@/lib/userStore"
import { findRoleByName } from "@/lib/rolesStore"
import { logServerAudit } from "@/lib/serverAuditLog"
import { z } from "zod"

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// Best-effort credential throttling. This is intentionally keyed by the
// normalized email and never changes the login error, so it does not reveal
// whether an account exists. Deployments with multiple instances should add
// an edge/WAF rate limit as well, because process memory is not shared.
const MAX_LOGIN_ATTEMPTS = 5
const LOGIN_WINDOW_MS = 15 * 60 * 1000
const loginAttempts = new Map<string, { count: number; windowStartedAt: number }>()

function canAttemptLogin(email: string, now = Date.now()) {
  const attempt = loginAttempts.get(email)
  if (!attempt || now - attempt.windowStartedAt >= LOGIN_WINDOW_MS) {
    loginAttempts.delete(email)
    return true
  }
  return attempt.count < MAX_LOGIN_ATTEMPTS
}

function recordFailedLogin(email: string, now = Date.now()) {
  const attempt = loginAttempts.get(email)
  if (!attempt || now - attempt.windowStartedAt >= LOGIN_WINDOW_MS) {
    loginAttempts.set(email, { count: 1, windowStartedAt: now })
    return
  }
  attempt.count += 1
}

function clearLoginAttempts(email: string) {
  loginAttempts.delete(email)
}

const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET
const googleClientId = process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET

if (!authSecret) {
  throw new Error("Missing required auth secret. Set AUTH_SECRET or NEXTAUTH_SECRET.")
}
if (authSecret.length < 32) {
  throw new Error("AUTH_SECRET or NEXTAUTH_SECRET must be at least 32 characters long.")
}

// Set ENABLE_GOOGLE_AUTH=false in .env.local to permanently disable Google login
// when the corporate network blocks Google OAuth endpoints.
const hasGoogleOAuth =
  process.env.ENABLE_GOOGLE_AUTH !== "false" &&
  !!(googleClientId && googleClientSecret)

// Try DB lookup, fall back to file store
async function lookupUser(email: string) {
  try {
    const { prisma } = await import("@/lib/prisma")
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, name: true, image: true, role: true, active: true, passwordHash: true },
    })
    if (user) return user
  } catch {
    // DB unavailable — fall through to file store
  }
  return findUserByEmail(email) as any ?? null
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Trust forwarded Host headers only when a trusted reverse proxy is in use.
  trustHost: process.env.AUTH_TRUST_HOST === "true",
  session: {
    strategy: "jwt",
    // Limit the useful lifetime of a stolen browser session to one workday.
    maxAge: 8 * 60 * 60,
    updateAge: 60 * 60,
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    ...(hasGoogleOAuth
      ? [
          Google({
            clientId: googleClientId!,
            clientSecret: googleClientSecret!,
            authorization: {
              params: {
                hd: "si-ware.com",
                prompt: "select_account",
              },
            },
          }),
        ]
      : []),
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials)
        if (!parsed.success) return null

        const email = parsed.data.email.toLowerCase()
        if (!canAttemptLogin(email)) {
          logServerAudit({
            actor: email, actorEmail: email, action: "login_rate_limited", targetId: "", targetTitle: "Portal sign-in",
            details: "Credential sign-in blocked after too many failed attempts", category: "authentication", outcome: "denied",
          })
          return null
        }
        const user = await lookupUser(email)

        if (!user || !user.active || !user.passwordHash) {
          recordFailedLogin(email)
          logServerAudit({
            actor: email, actorEmail: email, action: "login_failed", targetId: "", targetTitle: "Portal sign-in",
            details: "Credential sign-in failed", category: "authentication", outcome: "failure",
          })
          return null
        }

        const passwordMatches = await bcrypt.compare(parsed.data.password, user.passwordHash)
        if (!passwordMatches) {
          recordFailedLogin(email)
          logServerAudit({
            actor: email, actorEmail: email, action: "login_failed", targetId: user.id, targetTitle: "Portal sign-in",
            details: "Credential sign-in failed", category: "authentication", outcome: "failure",
          })
          return null
        }

        clearLoginAttempts(email)

        logServerAudit({
          actor: user.name ?? email, actorEmail: user.email, action: "login_succeeded", targetId: user.id,
          targetTitle: "Portal sign-in", details: "Credential sign-in succeeded", category: "authentication", outcome: "success",
        })

        return { id: user.id, email: user.email, name: user.name, image: user.image, role: user.role }
      },
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      // If NextAuth redirects to the error page, send back to login instead
      if (url.includes("/api/auth/error")) return `${baseUrl}/login`
      if (url.startsWith(baseUrl)) return url
      if (url.startsWith("/")) return `${baseUrl}${url}`
      return baseUrl
    },
    async signIn({ user, account }) {
      if (!user.email) return false

      // For Google sign-in, only allow si-ware.com domain
      if (account?.provider === "google") {
        if (!user.email.endsWith("@si-ware.com")) {
          logServerAudit({ actor: user.email, actorEmail: user.email, action: "login_failed", targetId: "", targetTitle: "Portal sign-in", details: "Google sign-in denied: non-corporate domain", category: "authentication", outcome: "denied" })
          return "/login?error=OAuthSignin"
        }
        // Inactive users are blocked regardless of provider. Check the
        // file store (the actual source of truth for the .active flag).
        const existing = findUserByEmail(user.email)
        if (existing && existing.active === false) {
          logServerAudit({ actor: user.email, actorEmail: user.email, action: "login_failed", targetId: existing.id, targetTitle: "Portal sign-in", details: "Google sign-in denied: inactive account", category: "authentication", outcome: "denied" })
          return "/login?error=AccessDenied"
        }
        logServerAudit({ actor: user.name ?? user.email, actorEmail: user.email, action: "login_succeeded", targetId: existing?.id ?? "", targetTitle: "Portal sign-in", details: "Google sign-in succeeded", category: "authentication", outcome: "success" })
        return true
      }

      // Credentials provider — block inactive users by checking the file store.
      const existing = findUserByEmail(user.email)
      if (existing && existing.active === false) {
        logServerAudit({ actor: user.email, actorEmail: user.email, action: "login_failed", targetId: existing.id, targetTitle: "Portal sign-in", details: "Credential sign-in denied: inactive account", category: "authentication", outcome: "denied" })
        return false
      }

      return true
    },
    async jwt({ token, user, account }) {
      if (user && account?.provider === "google") {
        const stored = upsertGoogleUser(user.email!, user.name ?? user.email!.split("@")[0], user.image ?? null)
        const { getPermissionsForRole } = await import("@/lib/userRoles")
        token.userId = stored.id
        token.email = stored.email
        token.role = stored.role
        token.name = stored.name
        // image deliberately omitted — see note in refresh branch below
        token.permissions = await getPermissionsForRole(stored.role)
        ;(token as any).mustChangePassword = false
        // Stamp issue time explicitly so the force-signout check has a
        // reliable comparison value. NextAuth sets `iat` internally but
        // mixing that with our refresh path was unreliable.
        ;(token as any).issuedAtSec = Math.floor(Date.now() / 1000)
        return token
      }

      if (user) {
        const role = (user as any).role || "Requester - Si-Ware"
        const { getPermissionsForRole } = await import("@/lib/userRoles")
        token.userId = user.id
        token.email = user.email
        token.role = role
        token.name = user.name
        token.permissions = await getPermissionsForRole(role)
        const stored = user.email ? findUserByEmail(user.email) : undefined
        ;(token as any).mustChangePassword = stored?.provider === "credentials" && stored.mustChangePassword === true
        ;(token as any).issuedAtSec = Math.floor(Date.now() / 1000)
        return token
      }

      // Refresh role + permissions + name on every session refresh.
      // NOTE: We deliberately do NOT put the avatar data URL on the JWT —
      // a 2 MB data URL would blow past the 4 KB cookie size limit and the
      // browser would drop the session. The image is read from the user
      // store in the session callback below instead.
      if (token.email) {
        // Use the same database-first lookup as credentials authorization.
        // A user that exists in PostgreSQL but not in the legacy JSON store
        // must not be mistaken for a deleted account and forced to sign out.
        const stored = await lookupUser(token.email as string)
        if (stored) {
          // If the user was deactivated since their last sign-in, mark the
          // token stale so middleware redirects them through signout on the
          // next request. Without this, an already-logged-in user keeps
          // browsing until their JWT expires (default: 30 days).
          if (stored.active === false) {
            ;(token as any).stale = true
            ;(token as any).inactive = true
            return token
          }
          token.role = stored.role
          token.name = stored.name
          const legacyStored = findUserByEmail(token.email as string)
          ;(token as any).mustChangePassword = legacyStored?.provider === "credentials" && legacyStored.mustChangePassword === true
          const { getPermissionsForRole } = await import("@/lib/userRoles")
          token.permissions = await getPermissionsForRole(stored.role)
        } else {
          // The user record disappeared (deleted) — also treat as stale.
          ;(token as any).stale = true
          ;(token as any).inactive = true
          return token
        }
      }

      // Force-signout + maintenance flag — read the shared state file and
      // stamp the result onto the token. Middleware reads these claims and
      // redirects to /api/auth/signout (which clears the cookie) when the
      // token was issued before the admin's force-signout cutoff.
      try {
        const { readMaintenanceState } = await import("@/lib/maintenanceMode")
        const state = readMaintenanceState()
        const issuedAt = typeof (token as any).issuedAtSec === "number"
          ? (token as any).issuedAtSec
          : (typeof token.iat === "number" ? token.iat : Math.floor(Date.now() / 1000))
        // Only mark stale when sessionMinVersion is set (> 0) AND strictly
        // newer than this token's issue time. Brand-new tokens issued
        // moments after the bump will still be valid because their
        // issuedAtSec is set in the user-branches above.
        ;(token as any).stale = state.sessionMinVersion > 0 && state.sessionMinVersion > issuedAt
        ;(token as any).maintenance = state.maintenance === true
      } catch {
        // best-effort — leave token alone on any error.
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string
        session.user.role = (token.role as string) || "Requester - Si-Ware"
        session.user.name = (token.name as string) ?? session.user.name
        // Read the avatar from the user store on each request instead of
        // pulling it from the JWT. Keeps the cookie small even with large
        // data-URL avatars; cost is one extra file read per request.
        if (token.email) {
          const stored = findUserByEmail(token.email as string)
          session.user.image = stored?.image ?? null
        }
        session.user.permissions = await getPermissionsForRole(session.user.role)
        ;(session.user as any).mustChangePassword = (token as any).mustChangePassword === true

        // Load module access control from role
        const role = findRoleByName(session.user.role)
        if (role) {
          ;(session.user as any).readModules = role.readModules || []
          ;(session.user as any).readAllModules = role.readAllModules || []
        }
      }
      return session
    },
  },
  events: {
    async signOut(message) {
      const token = (message as { token?: { email?: string; name?: string; userId?: string } }).token
      if (!token?.email) return
      logServerAudit({
        actor: token.name ?? token.email, actorEmail: token.email, action: "logout", targetId: token.userId ?? "",
        targetTitle: "Portal sign-out", details: "User signed out", category: "authentication", outcome: "success",
      })
    },
  },
})
