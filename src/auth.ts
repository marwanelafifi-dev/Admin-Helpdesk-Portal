import NextAuth, { customFetch as authCustomFetch } from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { getPermissionsForRole } from "@/lib/userRoles"
import { upsertGoogleUser, findUserByEmail } from "@/lib/userStore"
import { z } from "zod"

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const disableTlsCertCheck = process.env.DISABLE_TLS_CERT_CHECK === "true"

const customFetch = disableTlsCertCheck
  ? ((url: RequestInfo | URL, init?: RequestInit) => fetch(url, init))
  : fetch

if (disableTlsCertCheck) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
}

const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET
const googleClientId = process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET

if (!authSecret) {
  throw new Error("Missing required auth secret. Set AUTH_SECRET or NEXTAUTH_SECRET.")
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
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
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
            allowDangerousEmailAccountLinking: true,
            authorization: {
              params: {
                hd: "si-ware.com",
                prompt: "select_account",
              },
            },
            ...(disableTlsCertCheck && { [authCustomFetch]: customFetch }),
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
        const user = await lookupUser(email)

        if (!user || !user.active || !user.passwordHash) return null

        const passwordMatches = await bcrypt.compare(parsed.data.password, user.passwordHash)
        if (!passwordMatches) return null

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
        if (!user.email.endsWith("@si-ware.com")) return "/login?error=OAuthSignin"
        return true
      }

      try {
        const { prisma } = await import("@/lib/prisma")
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email.toLowerCase() },
          select: { active: true },
        })
        if (existingUser && !existingUser.active) return false
      } catch {
        // DB unavailable — allow sign in
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
        // Stamp issue time explicitly so the force-signout check has a
        // reliable comparison value. NextAuth sets `iat` internally but
        // mixing that with our refresh path was unreliable.
        ;(token as any).issuedAtSec = Math.floor(Date.now() / 1000)
        return token
      }

      if (user) {
        const role = (user as any).role || "requester"
        const { getPermissionsForRole } = await import("@/lib/userRoles")
        token.userId = user.id
        token.email = user.email
        token.role = role
        token.name = user.name
        token.permissions = await getPermissionsForRole(role)
        ;(token as any).issuedAtSec = Math.floor(Date.now() / 1000)
        return token
      }

      // Refresh role + permissions + name on every session refresh.
      // NOTE: We deliberately do NOT put the avatar data URL on the JWT —
      // a 2 MB data URL would blow past the 4 KB cookie size limit and the
      // browser would drop the session. The image is read from the user
      // store in the session callback below instead.
      if (token.email) {
        const stored = findUserByEmail(token.email as string)
        if (stored) {
          token.role = stored.role
          token.name = stored.name
          const { getPermissionsForRole } = await import("@/lib/userRoles")
          token.permissions = await getPermissionsForRole(stored.role)
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
        session.user.role = (token.role as string) || "requester"
        session.user.name = (token.name as string) ?? session.user.name
        // Read the avatar from the user store on each request instead of
        // pulling it from the JWT. Keeps the cookie small even with large
        // data-URL avatars; cost is one extra file read per request.
        if (token.email) {
          const stored = findUserByEmail(token.email as string)
          session.user.image = stored?.image ?? null
        }
        session.user.permissions = await getPermissionsForRole(session.user.role)
      }
      return session
    },
  },
})
