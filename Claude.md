# ROADMAP.md: Admin Request Platform

This document tracks the phased development of the Admin Request Platform, moving from the core engine to full module implementation.

## Phase 1: Foundation (Completed)
- [x] Architecture Planning & Diagramming.
- [x] Core NestJS Request Engine Setup.
- [x] Prisma + PostgreSQL Database Integration.
- [x] Global Dashboard & UI/UX Layout.
- [x] Authentication & RBAC System (Super Admin, Admin, Manager, Requester, Viewer).

## Phase 2: Core Module Implementation (Current)
- [x] **Shipping Module:** Full CRUD, tracking, and status updates.
  - [x] Shipping-specific statuses: Draft → New → On Hold → In Transit → Delivered → Completed → Cancelled.
  - [x] Carrier filter dropdown (DHL, FedEx, UPS, Aramex, TNT, Maersk, USPS).
  - [x] Stat cards: Total Shipments, On Hold, In Transit, Delivered.
- [x] **My Requests Page (Unified View):**
  - [x] Shows all requests across all modules scoped to the logged-in user.
  - [x] Unified status model: Draft, New, On Hold, In Transit, Delivered, Completed, Cancelled.
  - [x] Status and Module dropdown filters (same layout as Shipping module).
  - [x] Stats cards per status (8 cards: Total + one per status).
  - [x] Sidebar label renamed from "Requests" to "My Requests".
  - [x] Mock data seeded via `initializeMockData()` with version-based localStorage reset.
  - [x] Generic table columns: Request ID, Request Title, Requester Name, Status, Module.
- [x] **HR Module:**
  - [x] Zod schema for Onboarding and Offboarding payloads (`hr.schema.ts`).
  - [x] HR page with All / Onboarding / Offboarding tabs, stat cards, and filtered table.
  - [x] Statuses: New, On Hold, Completed.
  - [x] Onboarding items: Medical Insurance for New Hire, Access Card, Seating Assignment.
  - [x] Offboarding items: Close Medical for Leaver, Collect Access Card.
  - [x] 6 mock records seeded via `initializeMockData` (3 onboarding, 3 offboarding).
  - [x] Added to sidebar with `UserCog` icon; teal color in My Requests module filter.
  - [x] `HRForm.tsx` — create form with Onboarding/Offboarding toggle, checkbox items, Zod validation.
  - [x] `/hr/new` page — accepts `?type=onboarding|offboarding` query param to pre-select form type.
  - [x] "Add HR Request" dropdown button on HR page — links directly to Onboarding or Offboarding form.
  - [x] On submit → persists to engine store as `"new"` status → redirects to `/hr`.
- [ ] **Maintenance Module:**
    - [ ] Define Zod Schema for ticket fields.
    - [ ] Implement NestJS CRUD endpoints.
    - [ ] Build Ticket Management UI.
- [ ] **Purchase Module:**
    - [ ] Define Zod Schema for PO/Budget fields.
    - [ ] Implement NestJS logic + Budget calculation.
    - [ ] Build Procurement UI.

## Phase 3: Advanced Functionality (Upcoming)
- [ ] **Event Module:** Venue/Planning schema and calendar integration.
- [ ] **Travel Module:** Booking/Approval workflow.
- [ ] **Audit Trail Enhancement:** Add granular history logs to the dashboard.
- [ ] **Notifications System:** Automated email/in-app notifications for pending approvals.

## Phase 4: Optimization & Scaling
- [ ] Add Redis caching for frequently accessed dashboard data.
- [ ] Implement file upload storage service for AWB/Invoices/Receipts.
- [ ] Performance audit on polymorphic JSONB queries.

---

## Unified Status Model (All Modules)
| Status | Color | Meaning |
|--------|-------|---------|
| Draft | Zinc | Saved but not submitted |
| New | Gray | Submitted, awaiting action |
| On Hold | Orange | Blocked / awaiting external input |
| In Transit | Blue | Actively being processed |
| Delivered | Green | Item/service delivered |
| Completed | Emerald | Fully resolved and closed |
| Cancelled | Red | Cancelled by user or admin |

## Key Files
| File | Purpose |
|------|---------|
| `src/services/engineService.ts` | Core request engine, localStorage, mock data seed |
| `src/app/(dashboard)/requests/page.tsx` | My Requests unified view |
| `src/app/(dashboard)/shipping/page.tsx` | Shipping module page |
| `src/app/(dashboard)/hr/page.tsx` | HR module page (list + tabs) |
| `src/app/(dashboard)/hr/new/page.tsx` | New HR request form page |
| `src/modules/hr/hr.schema.ts` | Zod schemas for Onboarding & Offboarding |
| `src/modules/hr/HRForm.tsx` | HR create form (Onboarding / Offboarding toggle) |
| `src/components/layout/Sidebar.tsx` | Navigation sidebar |
| `src/lib/mock-data.ts` | Static mock data (shipments, users, roles) |
| `src/modules/shipping/ShippingForm.tsx` | Shipping request form |

---
### Development Loop (Repeat for each module)
1. **Sync Plan:** Update this `CLAUDE.md`.
2. **Define Schema:** Create/Update `Zod` schemas.
3. **Execute:** Write NestJS code & DB migrations.
4. **Verify:** Test against Audit Logs and JSONB validation.

