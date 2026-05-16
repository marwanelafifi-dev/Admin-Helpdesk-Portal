# 🔧 REFACTORED CODE EXAMPLES

Complete refactored versions of key files addressing security, performance, and code quality issues.

---

## 1. Improved Middleware (Refactored Route Permissions)

**File:** `src/middleware.ts`

```typescript
import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import { can, isRestricted } from "@/lib/permissions"

// ✅ DRY: Route patterns defined once
const ROUTE_PERMISSIONS = [
  { pattern: /^\/dashboard\/?/, permission: "dashboard" as const },
  { pattern: /^\/admin\/all-requests\/?/, permission: "allRequests" as const },
  { pattern: /^\/hr\/(new|edit)/, permission: "hrCreate" as const },
  { pattern: /^\/hr\/?/, permission: "hrModule" as const },
  { pattern: /^\/admin\/?/, permission: "adminPanel" as const },
] as const

function findRequiredPermission(pathname: string): typeof ROUTE_PERMISSIONS[0]["permission"] | null {
  for (const route of ROUTE_PERMISSIONS) {
    if (route.pattern.test(pathname)) {
      return route.permission
    }
  }
  return null
}

function checkAccess(pathname: string, role: string): boolean {
  const permission = findRequiredPermission(pathname)
  if (!permission) return true
  return can(role, permission)
}

function getFallbackUrl(role: string): string {
  return isRestricted(role) ? "/requests" : "/dashboard"
}

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // ✅ Redirect logged-in users away from login page
    if (pathname === "/login" && token) {
      return NextResponse.redirect(new URL(getFallbackUrl(token.role as string), req.url))
    }

    // ✅ Permission check
    if (token) {
      const role = token.role as string
      if (!checkAccess(pathname, role)) {
        return NextResponse.redirect(new URL(getFallbackUrl(role), req.url))
      }
    }
  },
  {
    callbacks: {
      authorized({ token, req }) {
        if (req.nextUrl.pathname === "/login") return true
        return !!token
      },
    },
    pages: { signIn: "/login" },
  }
)

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon\\.ico).*)"],
}
```

---

## 2. Improved Auth Configuration (Remove PII Logging)

**File:** `src/lib/auth/options.ts`

```typescript
import type { AuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { getPrisma } from "@/server/engine/prisma"
import type { UserRole } from "@prisma/client"
import { env } from "@/lib/env"
import { logger } from "@/lib/logger"

const companyDomain = env.GOOGLE_ALLOWED_DOMAIN.toLowerCase().trim()

export const authOptions: AuthOptions = {
  secret: env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },

  providers: [
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
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
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // ✅ No PII in logs
        logger.info("Credentials login attempt", { provider: "credentials" })

        if (!credentials?.email || !credentials?.password) {
          logger.warn("Credentials login failed", { reason: "missing_credentials" })
          return null
        }

        try {
          const prisma = getPrisma()
          const user = await prisma.user.findUnique({
            where: { email: credentials.email.toLowerCase() },
          })

          if (!user) {
            logger.warn("Credentials login failed", { reason: "user_not_found" })
            return null
          }

          if (!user.password) {
            logger.warn("Credentials login failed", { reason: "no_password_set" })
            return null
          }

          const valid = await bcrypt.compare(credentials.password, user.password)
          if (!valid) {
            logger.warn("Credentials login failed", { reason: "invalid_password" })
            return null
          }

          logger.info("Credentials login successful", { userId: user.id })
          return { id: user.id, name: user.name ?? "", email: user.email ?? "", role: user.role }
        } catch (error) {
          logger.error("Credentials login error", { error })
          return null
        }
      },
    }),
  ],

  callbacks: {
    async signIn({ account, profile }) {
      logger.info("Sign-in attempt", { provider: account?.provider })

      if (account?.provider === "credentials") return true

      // Google: verify domain + email_verified
      if (account?.provider === "google") {
        const email = profile?.email?.toLowerCase()
        if (!email) {
          logger.warn("Google sign-in failed", { reason: "no_email" })
          return false
        }

        const isVerified = (profile as { email_verified?: boolean }).email_verified === true
        if (!isVerified) {
          logger.warn("Google sign-in failed", { reason: "unverified_email" })
          return false
        }

        const emailDomain = email.split("@")[1]
        if (companyDomain && emailDomain !== companyDomain) {
          logger.warn("Google sign-in failed", { reason: "domain_mismatch", allowedDomain: companyDomain })
          return false
        }

        // Upsert user in DB
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
          logger.info("Google user upserted", { userId: email.split("@")[0] })
        } catch (dbError) {
          logger.error("Google upsert failed", { error: dbError })
        }
        return true
      }

      logger.warn("Unknown sign-in provider", { provider: account?.provider })
      return false
    },

    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.role = ((user as { role?: string }).role ?? "employee") as UserRole
      }

      // For Google, re-fetch role from DB on token refresh
      if (account?.provider === "google" && token.email) {
        try {
          const prisma = getPrisma()
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email as string },
            select: { id: true, role: true },
          })
          if (dbUser) {
            token.id = dbUser.id
            token.role = dbUser.role
          }
        } catch (error) {
          logger.error("JWT token refresh failed", { error })
        }
      }
      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as UserRole
      }
      return session
    },
  },
}
```

---

## 3. Optimized Store with N+1 Fix

**File:** `src/server/engine/store.ts` (excerpt)

```typescript
// ✅ Fixed: Use createMany instead of loop
export async function createAdminNotifications(
  requestId: string,
  module: string,
  title: string,
  requesterName: string,
  prisma: PrismaClient
): Promise<void> {
  // Single query to fetch admin IDs
  const admins = await prisma.user.findMany({
    where: { role: { in: ["super_admin", "admin"] } },
    select: { id: true },
  })

  if (admins.length === 0) return

  // ✅ Single batch insert instead of N inserts
  await prisma.notification.createMany({
    data: admins.map(admin => ({
      type: "admin_alert" as const,
      title: `New ${module} Request: ${title}`,
      message: `${requesterName} submitted a new request.`,
      userId: admin.id,
      requestId,
    })),
    skipDuplicates: true,
  })
}

// ✅ Fixed: Add validation and use proper types
export async function listRequests(
  query: ListRequestsQuery
): Promise<EngineRequest[]> {
  const db = await readDb()

  let results = db.requests

  // Apply filters
  if (query.module) {
    results = results.filter(r => r.module === query.module)
  }

  if (query.requesterId) {
    results = results.filter(r => r.requesterId === query.requesterId)
  }

  if (query.status && query.status.length > 0) {
    const statusSet = new Set(query.status)
    results = results.filter(r => statusSet.has(r.status))
  }

  // ✅ Optimized search with trim + validation
  if (query.q) {
    const needle = query.q.trim().toLowerCase()
    if (needle.length > 0) {
      results = results.filter(r => {
        const searchText = `${r.id} ${r.title} ${r.requesterName} ${r.requesterEmail}`.toLowerCase()
        return searchText.includes(needle)
      })
    }
  }

  // Sort and return
  return results.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))
}
```

---

## 4. Proper Error Handling Utility

**File:** Create `src/lib/api-error-handler.ts`

```typescript
import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { ZodError } from "zod"
import { logger } from "@/lib/logger"

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public context?: Record<string, unknown>
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export function handleApiError(error: unknown) {
  const isDev = process.env.NODE_ENV === "development"

  // ✅ Zod validation errors
  if (error instanceof ZodError) {
    logger.warn("Validation error", { issues: error.errors })
    return NextResponse.json(
      {
        error: "Validation error",
        issues: isDev ? error.errors : undefined,
      },
      { status: 400 }
    )
  }

  // ✅ Known Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    logger.error("Database error", { code: error.code, message: error.message })

    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Resource not found" },
        { status: 404 }
      )
    }

    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Unique constraint violation" },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: "Database error" },
      { status: 500 }
    )
  }

  // ✅ Custom API errors
  if (error instanceof ApiError) {
    logger.warn("Api error", {
      statusCode: error.statusCode,
      message: error.message,
      context: error.context,
    })
    return NextResponse.json(
      {
        error: error.message,
        ...(isDev && error.context && { context: error.context }),
      },
      { status: error.statusCode }
    )
  }

  // ✅ Generic error handling
  logger.error("Unexpected error", {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  })

  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 }
  )
}
```

---

## 5. Logger Implementation

**File:** Create `src/lib/logger.ts`

```typescript
type LogLevel = "info" | "warn" | "error" | "debug"

interface LogContext {
  [key: string]: unknown
}

function formatLog(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString()
  const contextStr = context ? ` ${JSON.stringify(context)}` : ""
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`
}

export const logger = {
  info(message: string, context?: LogContext) {
    console.log(formatLog("info", message, context))
  },

  warn(message: string, context?: LogContext) {
    console.warn(formatLog("warn", message, context))
  },

  error(message: string, context?: LogContext) {
    console.error(formatLog("error", message, context))
  },

  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === "development") {
      console.debug(formatLog("debug", message, context))
    }
  },
}
```

---

## 6. Rate Limiting Implementation

**File:** Create `src/lib/rate-limit.ts`

```typescript
// Simple in-memory rate limiter (suitable for dev/small deployments)
interface RateLimitEntry {
  count: number
  resetTime: number
}

const limiter = new Map<string, RateLimitEntry>()

const LIMITS = {
  createRequest: { maxRequests: 10, windowMs: 60000 }, // 10 per minute
  submitRequest: { maxRequests: 5, windowMs: 60000 },  // 5 per minute
  getRequests: { maxRequests: 30, windowMs: 60000 },   // 30 per minute
} as const

export function checkRateLimit(
  identifier: string,
  limitKey: keyof typeof LIMITS
): boolean {
  const { maxRequests, windowMs } = LIMITS[limitKey]
  const now = Date.now()
  const key = `${identifier}:${limitKey}`

  const entry = limiter.get(key)

  // Reset if window expired
  if (!entry || now > entry.resetTime) {
    limiter.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }

  // Check if limit exceeded
  if (entry.count >= maxRequests) {
    return false
  }

  // Increment and allow
  entry.count++
  return true
}

export function getRateLimitHeader(identifier: string, limitKey: keyof typeof LIMITS) {
  const { maxRequests, windowMs } = LIMITS[limitKey]
  const key = `${identifier}:${limitKey}`
  const entry = limiter.get(key)

  const remaining = Math.max(0, maxRequests - (entry?.count ?? 0))
  const resetTime = entry?.resetTime || Date.now() + windowMs

  return {
    "X-RateLimit-Limit": String(maxRequests),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(Math.ceil(resetTime / 1000)),
  }
}
```

---

## 7. Input Sanitization

**File:** Create `src/lib/sanitize.ts`

```typescript
import DOMPurify from "dompurify"
import { z } from "zod"

/**
 * Sanitizes HTML/script content from user input
 * Removes all HTML tags by default
 */
export function sanitizeText(input: string): string {
  if (!input) return ""
  // Remove all tags, keep text only
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] })
}

/**
 * Sanitizes but allows safe HTML (links, bold, italic)
 */
export function sanitizeHtml(input: string): string {
  if (!input) return ""
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "p", "br"],
    ALLOWED_ATTR: ["href", "title"],
  })
}

// ✅ Zod schema for sanitized strings
export const SanitizedStringSchema = z.string().transform(sanitizeText)

export const SanitizedHtmlSchema = z.string().transform(sanitizeHtml)

// Example usage in form schemas
export const CreateRequestSchema = z.object({
  title: SanitizedStringSchema.pipe(z.string().min(1)),
  description: SanitizedStringSchema.pipe(z.string().min(1)),
})
```

---

## 8. Environment Validation

**File:** `src/lib/env.ts`

```typescript
import { z } from "zod"

const EnvSchema = z.object({
  // Auth
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url().optional(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_ALLOWED_DOMAIN: z.string().min(1),

  // Database
  DATABASE_URL: z.string().url(),

  // Environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Optional
  DEBUG: z.string().optional(),
})

export const env = EnvSchema.parse(process.env)

export function validateEnv() {
  try {
    EnvSchema.parse(process.env)
    console.log("✅ Environment validation passed")
    return true
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Environment validation failed:")
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join(".")}: ${err.message}`)
      })
    }
    process.exit(1)
  }
}
```

---

## 9. Prisma Schema with Indexes

**File:** `prisma/schema.prisma` (excerpt)

```prisma
model Request {
  id            String      @id @default(cuid())
  module        String      // Shipping, HR, Maintenance, etc.
  title         String
  status        String      // new, on_hold, completed, etc.
  requesterId   String
  requesterName String?
  payload       Json        // Module-specific payload
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  requester Requester? @relation(fields: [requesterId], references: [id])

  // ✅ Critical indexes for performance
  @@index([module])
  @@index([requesterId])
  @@index([status])
  @@index([createdAt])
  @@index([module, status])           // Composite for filtering
  @@index([requesterId, createdAt])   // For user's request list
}

model Notification {
  id        String   @id @default(cuid())
  type      String   // request_submitted, admin_alert, etc.
  title     String
  message   String
  userId    String
  requestId String?
  read      Boolean  @default(false)
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([createdAt])
}
```

---

## Implementation Order

1. **Day 1:** Apply Quick Fixes #1-5 from `QUICK_FIXES.md`
2. **Day 2:** Implement error handler (Section 4) and logger (Section 5)
3. **Day 3:** Add rate limiting (Section 6) and sanitization (Section 7)
4. **Day 4:** Update env validation (Section 8) and add Prisma indexes (Section 9)
5. **Day 5:** Refactor middleware (Section 1) and auth (Section 2)

Test after each section: `npm run build && npm run dev`
