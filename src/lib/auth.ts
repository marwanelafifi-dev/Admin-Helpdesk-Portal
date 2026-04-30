import type { AuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { getPrisma } from "@/server/engine/prisma"
import type { UserRole } from "@prisma/client"

const companyDomain = (process.env.GOOGLE_ALLOWED_DOMAIN ?? "").toLowerCase().trim()

export const authOptions: AuthOptions = {
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
        if (!credentials?.email || !credentials?.password) return null
        const prisma = getPrisma()
        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        })
        if (!user?.password) return null
        const valid = await bcrypt.compare(credentials.password, user.password)
        if (!valid) return null
        return { id: user.id, name: user.name ?? "", email: user.email ?? "", role: user.role }
      },
    }),
  ],

  callbacks: {
    async signIn({ account, profile }) {
      // Credentials logins are handled by authorize() above
      if (account?.provider === "credentials") return true

      // Google: verify domain + email_verified
      if (account?.provider === "google") {
        const email = profile?.email?.toLowerCase()
        if (!email) return false
        const isVerified = (profile as { email_verified?: boolean }).email_verified === true
        if (!isVerified) return false
        if (companyDomain && email.split("@")[1] !== companyDomain) return false

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
        } catch {
          // Don't block sign-in if DB upsert fails
        }
        return true
      }

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
