# Admin Request Platform — Master Reference

## Architecture

### Frontend (Next.js App Router)
- UI routes: `src/app/(dashboard)/...`
- Shared layout: `src/app/(dashboard)/layout.tsx`, `src/components/layout/`

### Backend (Next.js Route Handlers — Node runtime)
| Route | File |
|-------|------|
| `GET /api/health` | `src/app/api/health/route.ts` |
| `GET\|POST /api/auth/[...nextauth]` | `src/app/api/auth/[...nextauth]/route.ts` |
| `GET\|POST /api/requests/:module` | `src/app/api/requests/[module]/route.ts` |
| `GET\|PATCH\|DELETE /api/requests/:module/:id` | `src/app/api/requests/[module]/[id]/route.ts` |
| `GET /api/dashboard` | `src/app/api/dashboard/route.ts` |
| `GET /api/analytics` | `src/app/api/analytics/route.ts` |
| `GET\|POST /api/users` | `src/app/api/users/route.ts` |
| `GET\|POST /api/notifications` | `src/app/api/notifications/route.ts` |

### Database
- PostgreSQL + Prisma ORM — schema: `prisma/schema.prisma`
- Singleton client: `src/server/engine/prisma.ts` → `getPrisma()`
- Shared import: `src/server/db.ts` → `prisma`

### Docker
- `Dockerfile` builds app on port `3003`
- `docker-compose.yml`: `web` (3003), `db` (5432), `migrate` (runs migrations first)
- Env template: `.env.example` → copy to `.env`

---

## Security Rules (NON-NEGOTIABLE)

### Authentication
**ALWAYS** use `getServerSession(authOptions)` — NEVER use `x-user-role` or `x-user-id` headers:
```typescript
const session = await getServerSession(authOptions)
if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```

### Authorization
- `can(session.user.role, 'permission')` from `@/lib/permissions`
- `isRestricted(session.user.role)` → employee/external see only their own data
- Role hierarchy: `super_admin > admin > manager > employee > external`
- API user creation: only `employee`, `external`, `manager` allowed — never `super_admin`/`admin`

### Input Validation
- All POST/PATCH must use Zod `.safeParse()` before DB access
- Return 400 with `details: parsed.error.flatten()` on failure
- Max lengths: title ≤ 500, message ≤ 1000

---

## Performance Rules

- **NEVER** `findMany()` without `take` (always paginate)
- **PREFER** `groupBy()` + `_count` over loading all rows
- **USE** `Promise.all([...])` for parallel independent queries
- **AVOID** N+1: no queries inside loops
- Dashboard uses `Cache-Control: private, s-maxage=60`

---

## Testing

```bash
npm run test              # unit + integration
npm run test:unit         # tests/unit only
npm run test:integration  # tests/integration only
npm run test:coverage     # with coverage (target ≥ 70%)
npm run test:e2e          # playwright
npm run test:all          # everything
```

### Structure
```
tests/
├── unit/                 # Pure logic — no DB, no HTTP
├── integration/          # API routes with mocked Prisma + NextAuth
├── e2e/                  # Playwright — real browser
└── setup/
    ├── global.setup.ts   # env vars
    ├── prisma.mock.ts    # prismaMock factory
    └── nextauth.mock.ts  # session helpers
```

### Conventions
- Every new API route must have: 401 (no auth), 403 (wrong role), 2xx (happy path)
- E2E: skip with `test.skip(REQUIRES_CREDS, SKIP_MSG)` when no credentials

---

## Docker Development

```bash
# Development (hot reload)
docker-compose up -d db
npm run dev

# Production
docker-compose build --no-cache
docker-compose up -d
```

- Container runs as non-root `nextjs`
- `NODE_TLS_REJECT_UNAUTHORIZED=0` = build-time ARG only
- Prisma uses `engineType = "binary"` for Alpine Linux

---

## Module Development Loop

1. Define Zod schema in `src/modules/<module>/<module>.schema.ts`
2. Add API routes in `src/app/api/requests/<module>/`
3. Add `getServerSession` auth + Zod validation to every handler
4. Write integration tests in `tests/integration/<module>.test.ts`
5. Add page in `src/app/(dashboard)/<module>/page.tsx`
6. Update this `CLAUDE.md`

---

## UI Design System

Every module page:
1. **Header** — title + subtitle + action button (blue-600)
2. **Stat cards** — 4 clickable `rounded-xl border-2` cards, synced with status filter
3. **Table card** — `<Card>` with search + filter pills
4. **Table** — `<table>` with `tableLayout: fixed`, dark slate header (`bg-slate-800`), zebra rows, dot + badge status indicators

### Standard Column Order
`Request ID` → `Request Title` → `Submission Date` → `Requester Name` → `[Module-Specific]` → `Status` → `Last Update Date`

All data cells: `text-sm font-medium text-gray-700`

### Status Model
| Status | Color | Meaning |
|--------|-------|---------|
| Draft | Zinc | Saved, not submitted |
| New | Sky | Submitted, awaiting action |
| On Hold | Amber | Blocked |
| In Progress | Blue | Being processed |
| Delivered | Green | Delivered |
| Completed | Emerald | Fully closed |
| Cancelled | Red | Cancelled |

---

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/permissions/client.ts` | `can()`, `isRestricted()`, `PERMISSIONS` |
| `src/lib/auth/options.ts` | NextAuth config |
| `src/lib/rate-limit.ts` | Rate limiter (swap Redis for prod) |
| `src/lib/pagination.ts` | `getPaginationParams()` |
| `src/lib/mailer.ts` | SMTP email sender |
| `src/server/engine/prisma.ts` | Prisma singleton `getPrisma()` |
| `prisma/schema.prisma` | DB schema + indexes |
| `vitest.config.ts` | Test config + coverage thresholds |
| `playwright.config.ts` | E2E config |
| `next.config.ts` | Security headers, compression, images |

---

## Roadmap

### Phase 1 — Foundation ✅
- Architecture, Prisma + PostgreSQL, Auth (Google + credentials), RBAC

### Phase 2 — Core Modules ✅
- Dashboard (KPIs, charts, alerts), All 6 modules (Shipping, HR, Maintenance, Purchase, Event, Travel)
- My Requests + All Requests pages, Notifications, AI Assistant (Groq)

### Phase 2.5 — Analytics ✅
- `/analytics` page: Performance, Trends, Resources, Export (CSV/JSON)
- APIs: `/api/analytics` with range filter

### Phase 2.6 — Enterprise Hardening ✅
- Security: auth bypass fixed, role escalation prevented, Zod validation
- Performance: DB aggregations, parallel queries, cache headers, indexes
- Testing: 43 tests, vitest + playwright + coverage

### Phase 3 — Advanced (Pending)
- [ ] Redis rate limiting (multi-instance)
- [ ] ML Predictions & Forecasting
- [ ] Audit Trail granular logs
- [ ] Scheduled email reports

### Phase 4 — Scaling (Pending)
- [ ] Redis caching for dashboard/analytics
- [ ] File upload service (AWB, invoices)
- [ ] NextAuth v5 migration
