import type { AuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { getPrisma } from "@/server/engine/prisma"

const companyDomain = (process.env.GOOGLE_ALLOWED_DOMAIN ?? "").toLowerCase()

export const authOptions: AuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },

  providers: [
    // ── Google (SI-Ware Workspace users) ──────────────────────────────────────
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

    // ── Credentials (external users with email + password) ────────────────────
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const prisma = getPrisma()
        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
          select: { id: true, name: true, email: true, image: true, role: true, password: true },
        })

        if (!user?.password) return null

        const isValid = await bcrypt.compare(credentials.password, user.password)
        if (!isValid) return null

        return {
          id: user.id,
          name: user.name ?? "",
          email: user.email ?? "",
          image: user.image ?? "",
          role: user.role,
        }
      },
    }),
  ],

  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true

      const email = profile?.email?.toLowerCase()
      if (!email) return false

      const isVerified = (profile as { email_verified?: boolean }).email_verified === true
      if (!isVerified) return false

      if (companyDomain && email.split("@")[1] !== companyDomain) return false

      const prisma = getPrisma()
      await prisma.user.upsert({
        where: { email },
        update: {
          name: profile?.name ?? undefined,
          image: (profile as { picture?: string }).picture ?? undefined,
          emailVerified: new Date(),
        },
        create: {
          email,
          name: profile?.name ?? null,
          image: (profile as { picture?: string }).picture ?? null,
          emailVerified: new Date(),
          role: "employee",
        },
      })

      return true
    },

    async jwt({ token, user, account }) {
      if (account?.provider === "google" && token.email) {
        const prisma = getPrisma()
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true, role: true },
        })
        if (dbUser) {
          token.id = dbUser.id
          token.role = dbUser.role
        }
      } else if (user) {
        token.id = (user as { id: string; role: string }).id
        token.role = (user as { id: string; role: string }).role as typeof token.role
      }
      return token
    },

    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id,
          role: token.role,
        },
      }
    },
  },
}
