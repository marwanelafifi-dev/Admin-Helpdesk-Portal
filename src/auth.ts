import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { getPermissionsForRole } from "@/lib/userRoles"
import { z } from "zod"

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID || "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET || "",
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials)

        if (!parsed.success) {
          return null
        }

        const email = parsed.data.email.toLowerCase()
        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            passwordHash: true,
            role: true,
            active: true,
          },
        })

        if (!user || !user.active || !user.passwordHash) {
          return null
        }

        const passwordMatches = await bcrypt.compare(parsed.data.password, user.passwordHash)

        if (!passwordMatches) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) {
        return false
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: user.email.toLowerCase() },
        select: { active: true },
      })

      if (existingUser && !existingUser.active) {
        return false
      }

      return true
    },
    async jwt({ token, user }) {
      const email = user?.email ?? token.email

      if (user) {
        token.userId = user.id
        token.email = user.email
        token.role = user.role || "requester"
        token.name = user.name
        token.picture = user.image ?? null
        return token
      }

      if (email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          select: {
            id: true,
            role: true,
            name: true,
            image: true,
            picture: true,
            active: true,
          },
        })

        if (dbUser?.active) {
          token.userId = dbUser.id
          token.email = email
          token.role = dbUser.role
          token.name = dbUser.name
          token.picture = dbUser.image ?? dbUser.picture ?? null
        }
      }
      return token
    },
    async session({ session, token }) {
      const lookupEmail = typeof token.email === "string" ? token.email.toLowerCase() : undefined
      const lookupId = typeof token.userId === "string" ? token.userId : undefined

      const dbUser = lookupId
        ? await prisma.user.findUnique({
            where: { id: lookupId },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              image: true,
              picture: true,
              active: true,
            },
          })
        : lookupEmail
          ? await prisma.user.findUnique({
              where: { email: lookupEmail },
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
                image: true,
                picture: true,
                active: true,
              },
            })
          : null

      if (session.user && dbUser?.active) {
        session.user.id = dbUser.id
        session.user.role = dbUser.role
        session.user.permissions = await getPermissionsForRole(dbUser.role)
        session.user.name = dbUser.name ?? session.user.name
        session.user.image = dbUser.image ?? dbUser.picture ?? session.user.image
      }
      return session
    },
  },
  events: {
    async createUser({ user }) {
      const userCount = await prisma.user.count()

      if (userCount === 1) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: "super_admin" },
        })
      }
    },
    async linkAccount({ user, account }) {
      if (account.provider !== "google") {
        return
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: account.providerAccountId,
          picture: user.image ?? null,
          image: user.image ?? null,
        },
      })
    },
  },
})
