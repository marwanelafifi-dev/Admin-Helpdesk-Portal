import type { AuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { getPrisma } from "@/server/engine/prisma"
import type { UserRole } from "@prisma/client"

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
        console.log("[Auth] Credentials login attempt for:", credentials?.email)
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
            console.warn("[Auth] User not found:", credentials.email)
            return null
          }

          if (!user.password) {
            console.warn("[Auth] User has no password set (likely Google user):", credentials.email)
            return null
          }

          const valid = await bcrypt.compare(credentials.password, user.password)
          if (!valid) {
            console.warn("[Auth] Invalid password for:", credentials.email)
            return null
          }

          console.log("[Auth] Login successful for:", credentials.email)
          return { id: user.id, name: user.name ?? "", email: user.email ?? "", role: user.role }
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
        console.log("[Auth] Google sign-in for:", email)
        if (!email) {
          console.warn("[Auth] No email in Google profile")
          return false
        }
        const isVerified = (profile as { email_verified?: boolean }).email_verified === true
        if (!isVerified) {
          console.warn("[Auth] Google email not verified")
          return false
        }
        if (companyDomain && email.split("@")[1] !== companyDomain) {
          console.warn(`[Auth] Email domain mismatch. Expected: ${companyDomain}, Got: ${email.split("@")[1]}`)
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
          console.log("[Auth] Google user upserted successfully")
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
        token.id   = user.id
        token.role = ((user as { role?: string }).role ?? "employee") as UserRole
      }
      // For Google, re-fetch role from DB on every token refresh
      if (account?.provider === "google" && token.email) {
        try {
          const prisma = getPrisma()
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email as string },
            select: { id: true, role: true },
          })
          if (dbUser) {
            token.id   = dbUser.id
            token.role = dbUser.role
          }
        } catch {
          // keep existing token values
        }
      }
      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id   = token.id as string
        session.user.role = token.role as UserRole
      }
      return session
    },
  },
}
