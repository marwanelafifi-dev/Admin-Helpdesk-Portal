# ⚡ QUICK FIXES - Top 5 Critical Issues

Start with these in order. Each takes 15-30 minutes.

---

## FIX #1: User Identity from Session (Not Headers) ⚠️ CRITICAL

**File:** `src/app/api/requests/submit/route.ts`  
**Impact:** Prevents privilege escalation / impersonation attacks  
**Time:** 20 min

**Replace entire file with:**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getPrisma } from '@/server/engine/prisma'
import { sendNewRequestNotification } from '@/lib/mailer'
import { getAdminEmails } from '@/lib/admin-emails-api'
import { z } from 'zod'

const SubmitRequestSchema = z.object({
  module: z.string().min(1),
  title: z.string().min(1),
  payload: z.record(z.unknown()).optional(),
})

export async function POST(req: NextRequest) {
  try {
    // ✅ Get user from authenticated session (not untrusted headers)
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // ✅ Validate body against schema
    const body = await req.json()
    const validated = SubmitRequestSchema.parse(body)

    const prisma = getPrisma()

    // ✅ Verify user exists in database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      )
    }

    // Create request with validated data
    const request = await prisma.request.create({
      data: {
        module: validated.module,
        title: validated.title,
        status: 'new',
        requesterId: user.id,
        payload: validated.payload || {},
      },
    })

    // Notify user
    await prisma.notification.create({
      data: {
        type: 'request_submitted',
        title: `Your ${validated.module} request has been submitted`,
        message: 'Your request has been submitted successfully.',
        userId: user.id,
        requestId: request.id,
      },
    })

    // Send admin notifications (async, non-blocking)
    try {
      const adminEmails = await getAdminEmails()
      const admins = await prisma.user.findMany({
        where: { role: { in: ['super_admin', 'admin'] } },
        select: { id: true },
      })

      // Batch create notifications
      if (admins.length > 0) {
        await prisma.notification.createMany({
          data: admins.map(admin => ({
            type: 'admin_alert',
            title: `New ${validated.module} Request: ${validated.title}`,
            message: `${user.name || 'A user'} submitted a new request.`,
            userId: admin.id,
            requestId: request.id,
          })),
          skipDuplicates: true,
        })
      }

      // Send email asynchronously (don't wait)
      sendNewRequestNotification(
        {
          id: request.id,
          module: request.module,
          title: request.title,
          requesterId: user.id,
          requesterName: user.name || 'Unknown',
          requesterEmail: user.email || '',
        },
        adminEmails.emails
      ).catch(error => {
        console.error('Email notification failed:', error)
      })
    } catch (notifyError) {
      console.error('Failed to send notifications:', notifyError)
      // Don't fail the request if notifications fail
    }

    return NextResponse.json(
      {
        success: true,
        requestId: request.id,
        message: 'Request submitted successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', issues: error.errors },
        { status: 400 }
      )
    }

    console.error('Failed to submit request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

## FIX #2: Validate Query Parameters ⚠️ CRITICAL

**File:** `src/app/api/requests/[module]/route.ts`  
**Impact:** Prevents integer overflow / DoS attacks  
**Time:** 15 min

**Replace entire file with:**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/server/engine/prisma'
import { z } from 'zod'

const QuerySchema = z.object({
  skip: z.coerce.number().int().min(0).max(10000).default(0),
  take: z.coerce.number().int().min(1).max(100).default(50),
  status: z.string().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: { module: string } }
) {
  try {
    const url = new URL(req.url)
    
    // ✅ Validate all query parameters
    const query = QuerySchema.parse({
      skip: url.searchParams.get('skip'),
      take: url.searchParams.get('take'),
      status: url.searchParams.get('status'),
    })

    const prisma = getPrisma()

    // ✅ Build safe query with validation
    const where = {
      module: params.module,
      ...(query.status && { status: query.status }),
    }

    const [requests, total] = await Promise.all([
      prisma.request.findMany({
        where,
        include: { requester: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      prisma.request.count({ where }),
    ])

    return NextResponse.json({
      requests,
      total,
      skip: query.skip,
      take: query.take,
      hasMore: query.skip + query.take < total,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', issues: error.errors },
        { status: 400 }
      )
    }

    console.error('Failed to fetch requests:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

## FIX #3: Remove Hardcoded Sensitive Data ⚠️ CRITICAL

**File:** `src/server/engine/store.ts` (line 108)  
**Impact:** Prevents data integrity issues / audit log corruption  
**Time:** 10 min

**Change from:**
```typescript
requesterEmail: meta.requesterEmail ?? "user@si-ware.com",
```

**Change to:**
```typescript
requesterEmail: meta.requesterEmail ?? undefined,
```

**Add validation at the top of `createRequest`:**
```typescript
export async function createRequest(module: string, body: unknown): Promise<EngineRequest> {
  const parsed = CreateBodySchema.parse(body)
  
  // ✅ Validate required fields
  if (!parsed.meta.requesterEmail) {
    throw new Error("Requester email is required")
  }
  
  const db = await readDb()
  // ... rest of function
}
```

---

## FIX #4: Remove PII from Logs ⚠️ CRITICAL

**File:** `src/lib/auth/options.ts` (lines 34, 62, 74, 81, 109)  
**Impact:** GDPR/CCPA compliance + prevents log-based data leakage  
**Time:** 15 min

**Replace all console.log statements that log emails:**

```typescript
// BEFORE (delete these lines):
console.log("[Auth] Credentials login attempt for:", credentials?.email)
console.warn("[Auth] User not found:", credentials.email)
console.log("[Auth] Login successful for:", credentials.email)
console.log("[Auth] Google sign-in for:", email)

// AFTER (add these):
console.log("[Auth] Credentials login attempt")
console.warn("[Auth] User not found")
console.log("[Auth] Login successful")
console.log("[Auth] Google sign-in attempt")
```

**Or better - use structured logging:**

```typescript
import { logger } from "@/lib/logger"

logger.info("Credentials login attempt", { provider: "credentials" })
logger.warn("User not found", { provider: "credentials" })
logger.info("Login successful", { provider: "credentials" })
logger.info("Google sign-in", { provider: "google" })
```

---

## FIX #5: Add Environment Validation ⚠️ CRITICAL

**File:** Create new file `src/lib/env.ts`  
**Impact:** Fail fast on startup if config is missing  
**Time:** 15 min

```typescript
import { z } from "zod"

const EnvSchema = z.object({
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET must be >= 32 chars"),
  NEXTAUTH_URL: z.string().url().optional(),
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET required"),
  GOOGLE_ALLOWED_DOMAIN: z.string().min(1, "GOOGLE_ALLOWED_DOMAIN required"),
  DATABASE_URL: z.string().url("DATABASE_URL must be valid URL"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
})

export const env = EnvSchema.parse(process.env)

export function validateEnv() {
  try {
    EnvSchema.parse(process.env)
    console.log("✅ Environment variables validated")
  } catch (error) {
    console.error("❌ Environment validation failed:", error)
    process.exit(1)
  }
}
```

**Then in `src/app/layout.tsx` or middleware initialization:**

```typescript
import { validateEnv } from "@/lib/env"

// Call at app startup
if (typeof window === "undefined") {
  validateEnv()
}
```

---

## Testing Checklist

After each fix:

- [ ] No TypeScript errors: `npm run build`
- [ ] Code passes linting: `npm run lint`
- [ ] Manual test the functionality
- [ ] Check for console warnings in dev tools

---

## What's Next?

1. Apply these 5 fixes in order
2. Test with `npm run dev`
3. Commit changes
4. Review remaining issues in `TECHNICAL_AUDIT.md`
5. Priority: Fix all 🔴 CRITICAL issues before deploying
