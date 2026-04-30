import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
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

        // Super Admin user
        if (parsed.data.email === "marwan.elafifi@si-ware.com" && parsed.data.password === "password") {
          return {
            id: "USR-001",
            email: "marwan.elafifi@si-ware.com",
            name: "Marwan Elafifi",
            image: null,
            role: "super_admin",
          }
        }

        // Demo user for testing
        if (parsed.data.email === "test@si-ware.com" && parsed.data.password === "password") {
          return {
            id: "USR-001",
            email: "test@si-ware.com",
            name: "Test User",
            image: null,
            role: "admin",
          }
        }

        return null
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) {
        return false
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id
        token.role = user.role || "user"
        token.name = user.name
        token.picture = user.image
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string
        session.user.role = token.role as string
      }
      return session
    },
  },
})
