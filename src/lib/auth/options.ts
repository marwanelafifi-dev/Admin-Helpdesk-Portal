import type { AuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { createHash } from "crypto"
import { getPrisma } from "@/server/engine/prisma"
import type { UserRole } from "@prisma/client"

function hashEmail(email: string): string {
  return createHash("sha256").update(email.toLowerCase()).digest("hex").slice(0, 12)
}

const companyDomain = (process.env.GOOGLE_ALLOWED_DOMAIN ?? "").toLowerCase().trim()

export const authOptions: AuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          hd: companyDomain || undefined,
          prompt: "select_account",
        },
      },
    }),

    CredentialsProvider({
      name: "credentials",
      credentials: {
        email:    { label: "Email",    type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const emailHash = credentials?.email ? hashEmail(credentials.email) : "unknown"
        console.log("[Auth] Credentials login attempt for hash:", emailHash)
        if (!credentials?.email || !credentials?.password) {
          console.warn("[Auth] Missing email or password")
          return null
        }

        try {
          const prisma = getPrisma()
          const user = await prisma.user.findUnique({
            where: { email: credentials.email.toLowerCase() },
          })

          if (!user) {
            console.warn("[Auth] User not found, hash:", emailHash)
            return null
          }

          if (!user.password) {
            console.warn("[Auth] User has no password set (likely Google user), hash:", emailHash)
            return null
          }

          const valid = await bcrypt.compare(credentials.password, user.password)
          if (!valid) {
            console.warn("[Auth] Invalid password, hash:", emailHash)
            return null
          }

          console.log("[Auth] Login successful, hash:", emailHash)
          return {
            id: user.id,
            name: user.name ?? "",
            email: user.email ?? "",
            role: user.role,
            sessionVersion: user.sessionVersion,
          }
        } catch (error) {
          console.error("[Auth] Error during authorize:", error)
          return null
        }
      },
    }),
  ],

  callbacks: {
    async signIn({ account, profile }) {
      console.log("[Auth] Sign-in attempt with provider:", account?.provider)
      // Credentials logins are handled by authorize() above
      if (account?.provider === "credentials") return true

      // Google: verify domain + email_verified
      if (account?.provider === "google") {
        const email = profile?.email?.toLowerCase()
        if (!email) {
          console.warn("[Auth] No email in Google profile")
          return false
        }
        const emailHash = hashEmail(email)
        console.log("[Auth] Google sign-in, hash:", emailHash)
        const isVerified = (profile as { email_verified?: boolean }).email_verified === true
        if (!isVerified) {
          console.warn("[Auth] Google email not verified, hash:", emailHash)
          return false
        }
        if (companyDomain && email.split("@")[1] !== companyDomain) {
          console.warn("[Auth] Email domain mismatch for hash:", emailHash)
          return false
        }

        // Upsert user in DB so Google users exist as rows
        try {
          const prisma = getPrisma()
          await prisma.user.upsert({
            where: { email },
            update: { name: profile?.name ?? undefined, emailVerified: new Date() },
            create: {
              email,
              name: profile?.name ?? "",
              emailVerified: new Date(),
              role: "employee",
            },
          })
          console.log("[Auth] Google user upserted successfully, hash:", emailHash)
        } catch (dbError) {
          // Don't block sign-in if DB upsert fails, but log it
          console.error("[Auth] Database error during Google upsert:", dbError)
        }
        return true
      }

      console.warn("[Auth] Unknown provider:", account?.provider)
      return false
    },

    async jwt({ token, user, account }) {
      // On first sign-in, `user` is populated
      if (user) {
        token.id = user.id
        token.email = user.email
        token.role = ((user as { role?: string }).role ?? "employee") as UserRole
        token.sessionVersion = (user as { sessionVersion?: number }).sessionVersion ?? 0
      }

      try {
        const prisma = getPrisma()
        // Try by DB id first
        let dbUser = token.id
          ? await prisma.user.findUnique({
              where: { id: token.id as string },
              select: { id: true, role: true, sessionVersion: true },
            })
          : null

        // For Google OAuth the token.id is the Google account id, not our cuid —
        // fall back to email lookup to get the real DB row
        if (!dbUser && token.email) {
          dbUser = await prisma.user.findUnique({
            where: { email: (token.email as string).toLowerCase() },
            select: { id: true, role: true, sessionVersion: true },
          })
        }

        if (dbUser) {
          token.id = dbUser.id
          token.role = dbUser.role
          token.sessionVersion = dbUser.sessionVersion
        }
      } catch {
        // keep existing token values
      }

      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as UserRole
        session.user.sessionVersion = token.sessionVersion as number
      }
      return session
    },
  },
}
