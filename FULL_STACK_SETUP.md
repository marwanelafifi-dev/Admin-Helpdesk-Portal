# Full Stack Setup - Admin Request Platform

**Date:** April 30, 2026  
**Status:** ✅ Phase 1 Complete - Ready for Phase 2 Integration  
**Architecture:** Next.js + NestJS + PostgreSQL  

---

## Overview

You now have a complete full-stack application:

```
┌─────────────────────────────────────────────────────────────┐
│           FRONTEND (Next.js)                                │
│           http://localhost:3003                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Pages: Shipping, HR, Maintenance, Purchase, Dashboard│ │
│  │ Forms: ShippingForm, HRForm, MaintenanceForm, etc.   │ │
│  │ State: React Hook Form + Zod validation              │ │
│  │ UI: Tailwind CSS + shadcn/ui components              │ │
│  └───────────────────────────────────────────────────────┘ │
│                        │ REST API Calls                     │
└────────────────────────┼──────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│           BACKEND (NestJS)                                  │
│           http://localhost:3001                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Controllers: RequestsController, CommentsController   │ │
│  │ Services: RequestsService, CommentsService            │ │
│  │ Modules: Requests, Comments, History                 │ │
│  │ Validation: class-validator DTOs                      │ │
│  └───────────────────────────────────────────────────────┘ │
│                        │ Prisma ORM                        │
└────────────────────────┼──────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│           DATABASE (PostgreSQL)                             │
│           localhost:5432/siware_db                          │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 11 Tables: User, Request, Comment, Attachment, etc.  │ │
│  │ Prisma Schema: prisma/schema.prisma (shared)          │ │
│  │ Type Safety: Auto-generated types from schema         │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Repositories

### 1. Frontend Repository
**Location:** `d:/SWS/Git-Repos/admin-request-platform`  
**Framework:** Next.js 15 + React 19  
**Port:** 3003  
**Status:** ✅ UI Complete, Wired to localStorage (ready for backend)

**Key Files:**
- `src/app/(dashboard)/` — All page components
- `src/modules/` — Form components (Shipping, HR, Maintenance, Purchase)
- `src/lib/prisma.ts` — Prisma client singleton
- `src/services/` — Service layer stubs (ready for implementation)
- `prisma/schema.prisma` — Database schema (shared with backend)
- `PHASE1_COMPLETE.md` — Phase 1 documentation
- `BACKEND_OVERVIEW.md` — Integration guide

### 2. Backend Repository
**Location:** `d:/SWS/Git-Repos/admin-request-backend`  
**Framework:** NestJS 10 + Prisma 6  
**Port:** 3001  
**Status:** ✅ Complete, ready for testing

**Key Files:**
- `src/prisma/` — Prisma service + module
- `src/requests/` — Requests CRUD endpoints
- `src/comments/` — Comments endpoints
- `src/history/` — Audit trail endpoints
- `src/main.ts` — CORS configuration
- `prisma/schema.prisma` — Database schema (shared with frontend)
- `BACKEND_SETUP.md` — Backend documentation

---

## Database Setup

### PostgreSQL Configuration
```
Host:       localhost
Port:       5432
Database:   siware_db
User:       postgres
Password:   password123
Charset:    UTF-8
```

### Schema
**Location:** `prisma/schema.prisma` (shared between frontend & backend)

**11 Tables:**
1. `User` — OAuth + multi-email support
2. `Request` — Polymorphic request storage (all modules)
3. `RequestHistory` — Audit trail
4. `Comment` — Discussion threads
5. `CommentAttachment` — Files in comments
6. `Attachment` — Request attachments
7. `Notification` — Alerts
8. `NotificationPreference` — User settings
9. `Approval` — Workflow tracking
10. `Session` — NextAuth sessions
11. Additional indexes for performance

### Prisma Commands
```bash
# Generate Prisma client
npx prisma generate

# Sync schema to database
npx prisma db push

# Open database UI
npx prisma studio
```

---

## Running Both Services

### Terminal 1: Start Backend
```bash
cd d:/SWS/Git-Repos/admin-request-backend
npm run start:dev
# Starts on http://localhost:3001
```

### Terminal 2: Start Frontend
```bash
cd d:/SWS/Git-Repos/admin-request-platform
npm run dev
# Starts on http://localhost:3003
```

---

## API Endpoints (Backend)

### Requests Module
```
GET    /api/requests/shipping              — List shipments
POST   /api/requests/shipping              — Create shipment
GET    /api/requests/shipping/:id          — Get shipment
PATCH  /api/requests/shipping/:id          — Update shipment
PATCH  /api/requests/shipping/:id/status   — Update status
DELETE /api/requests/shipping/:id          — Delete shipment

GET    /api/requests/hr                    — List HR requests
POST   /api/requests/hr                    — Create HR request
... (same pattern for hr, maintenance, purchase)
```

### Comments Module
```
GET    /api/requests/:module/:id/comments           — List comments
POST   /api/requests/:module/:id/comments           — Create comment
PATCH  /api/requests/:module/:id/comments/:cmtId    — Edit comment
DELETE /api/requests/:module/:id/comments/:cmtId    — Delete comment
POST   /api/requests/:module/:id/comments/:cmtId/attachments
DELETE /api/requests/:module/:id/comments/:cmtId/attachments/:attId
```

### History Module
```
GET    /api/requests/:module/:id/history   — Get audit trail
```

---

## Phase 1: Complete ✅

**Deliverables:**
- ✅ PostgreSQL database set up locally
- ✅ Prisma schema with 11 tables
- ✅ Prisma client singleton in frontend
- ✅ Service layer stubs in frontend
- ✅ Complete NestJS backend with 3 modules
- ✅ 15 API endpoints implemented
- ✅ DTOs for request validation
- ✅ CORS configured for frontend
- ✅ Type safety throughout
- ✅ Git repositories initialized

---

## Phase 2: Next (Integration)

### 2.1 Wire Frontend Forms to Backend
**Objective:** Forms POST to backend instead of localStorage

**Files to Update:**
- `src/modules/shipping/ShippingForm.tsx`
- `src/modules/hr/HRForm.tsx`
- `src/modules/maintenance/MaintenanceForm.tsx`
- `src/modules/purchase/PurchaseForm.tsx`

**Changes:**
```typescript
// OLD: Uses localStorage
const request = submitRequest('shipping', payload, {...})

// NEW: Uses backend API
const response = await fetch('http://localhost:3001/api/requests/shipping', {
  method: 'POST',
  body: JSON.stringify({
    title: payload.title,
    payload: payload,
    requesterId: 'USR-001', // From session
  }),
})
```

### 2.2 Wire Frontend Pages to Backend
**Objective:** Pages GET from backend instead of mock data

**Files to Update:**
- `src/app/(dashboard)/shipping/receiving/page.tsx`
- `src/app/(dashboard)/hr/page.tsx`
- `src/app/(dashboard)/maintenance/page.tsx`
- `src/app/(dashboard)/purchase/page.tsx`

**Changes:**
```typescript
// OLD: Uses mock data
const requests = mockRequests

// NEW: Uses backend API
useEffect(() => {
  fetch('http://localhost:3001/api/requests/shipping')
    .then(r => r.json())
    .then(data => setRequests(data.data))
}, [])
```

### 2.3 Implement Audit Trail
**Objective:** Record all changes to requests

Already implemented in backend — just add UI component to display history.

### 2.4 Implement Comments
**Objective:** Discussion threads on requests

Already implemented in backend — build frontend UI component.

---

## Phase 3: Next (Advanced Features)

### 3.1 Notifications
- Implement notification service
- Trigger on status changes
- Send emails via Google Workspace SMTP
- Add notification bell to header

### 3.2 Google OAuth
- Set up NextAuth.js
- Configure Google OAuth provider
- Enforce @si-ware.com domain
- Replace hardcoded USR-001 with real users
- Add user profile page

---

## Development Workflow

### Start Development
```bash
# Terminal 1: Backend
cd admin-request-backend && npm run start:dev

# Terminal 2: Frontend
cd admin-request-platform && npm run dev

# Terminal 3: Database UI (optional)
cd admin-request-backend && npx prisma studio
```

### Test API
```bash
# Create shipping request
curl -X POST http://localhost:3001/api/requests/shipping \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test",
    "payload": {"supplier": "Test"},
    "requesterId": "USR-001"
  }'

# List shipping requests
curl http://localhost:3001/api/requests/shipping

# Get request with comments and history
curl http://localhost:3001/api/requests/shipping/[ID]

# View audit trail
curl http://localhost:3001/api/requests/shipping/[ID]/history
```

### Debug
```bash
# Frontend errors → http://localhost:3003
# Backend errors → http://localhost:3001 + console
# Database → http://localhost:5555 (prisma studio)
```

---

## Tech Stack Summary

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend** | Next.js | 15 | UI + routing |
| | React | 19 | Components |
| | TypeScript | Latest | Type safety |
| | Tailwind CSS | 3.4 | Styling |
| | shadcn/ui | Latest | Components |
| | React Hook Form | 7.74 | Forms |
| | Zod | 4.3 | Validation |
| **Backend** | NestJS | 10 | REST API |
| | Express | Latest | HTTP framework |
| | TypeScript | Latest | Type safety |
| **Database** | PostgreSQL | Latest | Data storage |
| | Prisma | 6.19 | ORM |
| | Prisma Client | 6.19 | Type-safe queries |
| **DevOps** | Docker | (optional) | Containerization |
| | Git | Latest | Version control |

---

## Estimated Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| Phase 1: Database Foundation | 1 day | ✅ Complete |
| Phase 2: Integration | 3-4 days | 🔄 Next |
| Phase 3: Advanced Features | 5-7 days | ⏳ Later |
| **Total** | **~2 weeks** | In Progress |

---

## Success Criteria

✅ Database: PostgreSQL + Prisma set up locally  
✅ Backend: NestJS API with 15 endpoints  
✅ Frontend: Next.js UI with 6 modules  
✅ Type Safety: Full TypeScript throughout  
✅ API: REST endpoints for CRUD + Comments + History  
✅ CORS: Frontend can call backend from different port  

🔄 **Next:** Wire frontend to backend API  

---

## Key Files to Know

### Frontend
- `src/app/(dashboard)/shipping/receiving/page.tsx` — Shipping list
- `src/modules/shipping/ShippingForm.tsx` — Shipping form (needs wiring)
- `src/lib/prisma.ts` — Prisma client
- `prisma/schema.prisma` — Database schema

### Backend
- `src/requests/requests.controller.ts` — Request endpoints
- `src/comments/comments.controller.ts` — Comment endpoints
- `src/history/history.controller.ts` — History endpoints
- `src/main.ts` — CORS + validation

### Database
- `prisma/schema.prisma` — Single source of truth
- `.env` — DATABASE_URL

---

## Troubleshooting

### Backend won't start
```bash
# Check port 3001 is free
netstat -ano | findstr :3001

# Check database is running
psql -U postgres -d siware_db -c "SELECT 1"
```

### Frontend can't reach backend
```bash
# Check CORS is enabled
# Check backend is running on :3001
curl http://localhost:3001

# Check frontend is on :3003
# (CORS allows both 3003 and 3000)
```

### Database schema doesn't match
```bash
# Sync schema to database
npx prisma db push

# View database UI
npx prisma studio
```

---

## Next Immediate Steps

1. **Start Both Services:**
   - Terminal 1: `cd admin-request-backend && npm run start:dev`
   - Terminal 2: `cd admin-request-platform && npm run dev`

2. **Test Backend:** Open http://localhost:3001/api/requests/shipping

3. **Wire One Form:** Update `ShippingForm.tsx` to POST to backend

4. **Wire One Page:** Update `shipping/receiving/page.tsx` to GET from backend

5. **End-to-End Test:** Create request via form, see it in list

---

**Status:** Ready for Phase 2! 🚀

All infrastructure is in place. Next step is connecting the frontend forms and pages to the backend API.
