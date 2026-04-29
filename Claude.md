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
  - [x] Carrier filter pills (DHL, FedEx, UPS, Aramex, Other).
  - [x] Stat cards: Total Shipments, On Hold, In Transit, Delivered — clickable, sync with filter.
  - [x] Sortable + resizable dark slate table header. Zebra rows, dot indicators, footer count.
- [x] **My Requests Page (Unified View):**
  - [x] Shows all requests across all modules scoped to the logged-in user (USR-001).
  - [x] 8 clickable stat cards (Total, Draft, New, On Hold, In Transit, Delivered, Completed, Cancelled) — highlight in status color when active.
  - [x] Status and Module quick-filter pill rows with per-color active states.
  - [x] Sortable + resizable dark slate table (native `<table>` + `<colgroup>`).
  - [x] Columns: Request ID, Title, Submitted, Module, Status, Updated — all sortable and resizable.
  - [x] Zebra rows, dot indicators, footer count.
  - [x] Sidebar label: "My Requests".
- [x] **All Requests Page (Admin View):**
  - [x] Page at `/admin/all-requests` — shows all requests across all team members.
  - [x] Title: "All Requests"; sidebar item positioned directly after Dashboard.
  - [x] Sidebar active highlight scoped to exact path `/admin/all-requests` (does not bleed into Admin parent item).
  - [x] Overview stat cards: Total Requests, New, On Hold, Completed — clickable.
  - [x] Quick-filter pills for Module (All, Shipping, Maintenance, Purchase, Event, Travel, HR) and Status (All + 7 statuses + Active special filter).
  - [x] Active pill highlights in the matching color per module/status.
  - [x] Sortable + resizable dark slate table. Columns: Request ID, Title, Requester (name + email), Module, Status, Last Updated.
  - [x] Search by ID, title, or requester name.
- [x] **HR Module:**
  - [x] Zod schema for Onboarding and Offboarding payloads (`hr.schema.ts`).
  - [x] HR page with All / Onboarding / Offboarding tabs, stat cards, and filtered table.
  - [x] Sortable + resizable dark slate table. Columns: Request ID, Type, Employee Name, Employee ID, Department, Items, Date, Status.
  - [x] Statuses: New, On Hold, Completed.
  - [x] Onboarding items: Medical Insurance for New Hire, Access Card, Seating Assignment.
  - [x] Offboarding items: Close Medical for Leaver, Collect Access Card. Offboarding displayed in red.
  - [x] 6 mock records (3 onboarding, 3 offboarding) + 2 team records seeded via `initializeMockData`.
  - [x] Added to sidebar with `UserCog` icon; teal color in My Requests module filter.
  - [x] `HRForm.tsx` — create form with Onboarding/Offboarding toggle, checkbox items, Zod validation.
  - [x] `/hr/new` page — accepts `?type=onboarding|offboarding` query param to pre-select form type.
  - [x] "Add HR Request" dropdown button (blue-600) on HR page — links directly to Onboarding or Offboarding form.
  - [x] On submit → persists to engine store as `"new"` status → redirects to `/hr`.
- [x] **Maintenance Module page** — formal redesign + real mock data:
  - [x] 4 clickable stat cards: Total Tickets, New, In Progress, Completed.
  - [x] Status filter pills + search. Sortable + resizable dark slate table.
  - [x] Columns: Request ID, Title, Priority (color-coded High/Medium/Low), Status, Last Updated.
  - [x] 5 mock records across all statuses. "Coming soon" message preserved below table.
  - [ ] Define Zod Schema for ticket fields.
  - [ ] Build full create form + NestJS CRUD endpoints.
- [x] **Purchase Module page** — formal redesign + real mock data:
  - [x] 4 clickable stat cards: Total Orders, New, Pending Approval, Completed.
  - [x] Status filter pills + search. Sortable + resizable dark slate table.
  - [x] Columns: Request ID, Title, Supplier, Budget, Status, Last Updated.
  - [x] 4 mock records across statuses. "Coming soon" message preserved.
  - [ ] Define Zod Schema for PO/Budget fields.
  - [ ] Build full create form + NestJS logic + budget calculation.
- [x] **Event Module page** — formal redesign + real mock data:
  - [x] 4 clickable stat cards: Total Events, Upcoming, Pending, Completed.
  - [x] Status filter pills + search. Sortable + resizable dark slate table.
  - [x] Columns: Request ID, Title, Event Date, Attendees, Status, Last Updated.
  - [x] 4 mock records (New, On Hold, In Transit, Completed). "Coming soon" message preserved.
  - [ ] Define Zod Schema + build create form + calendar integration.
- [x] **Travel Module page** — formal redesign + real mock data:
  - [x] 4 clickable stat cards: Total Trips, Upcoming, On Hold, Completed.
  - [x] Status filter pills + search. Sortable + resizable dark slate table.
  - [x] Columns: Request ID, Title, Destination, Travel Date, Status, Last Updated.
  - [x] 5 mock records across statuses. "Coming soon" message preserved.
  - [ ] Define Zod Schema + build booking/approval workflow form.
- [x] **engineService mock data** — bumped to `v7`. Total seeded records: 8 SHP, 5 MNT, 4 PRC, 4 EVT, 5 TRV, 8 HR (including team records).

## Phase 3: Advanced Functionality (Upcoming)
- [ ] **Audit Trail Enhancement:** Add granular history logs to the dashboard.
- [ ] **Notifications System:** Automated email/in-app notifications for pending approvals.

## Phase 4: Optimization & Scaling
- [ ] Add Redis caching for frequently accessed dashboard data.
- [ ] Implement file upload storage service for AWB/Invoices/Receipts.
- [ ] Performance audit on polymorphic JSONB queries.

---

## UI Design System (All Pages — Consistent Pattern)
Every module page follows the same formal layout:
1. **Header** — page title + subtitle + action button (blue-600).
2. **Stat cards** — 4 clickable rounded-xl border-2 cards; active card fills in its color; synced with status filter.
3. **Table card** — `<Card>` with `<CardHeader>` containing search input + status filter pills (+ any module-specific secondary pills).
4. **Table** — native `<table>` with `tableLayout: fixed`, `<colgroup>` for resizable columns, dark slate (`bg-slate-800`) sortable header with drag handles, zebra rows, dot + badge status indicators, footer count.

## Unified Status Model (All Modules)
| Status | Color | Meaning |
|--------|-------|---------|
| Draft | Zinc | Saved but not submitted |
| New | Sky | Submitted, awaiting action |
| On Hold | Amber | Blocked / awaiting external input |
| In Transit | Blue | Actively being processed |
| Delivered | Green | Item/service delivered |
| Completed | Emerald | Fully resolved and closed |
| Cancelled | Red | Cancelled by user or admin |

## Key Files
| File | Purpose |
|------|---------|
| `src/services/engineService.ts` | Core request engine, localStorage, mock data seed (v7) |
| `src/app/(dashboard)/requests/page.tsx` | My Requests unified view |
| `src/app/(dashboard)/admin/all-requests/page.tsx` | All Requests admin view (all team members) |
| `src/app/(dashboard)/shipping/page.tsx` | Shipping module page |
| `src/app/(dashboard)/hr/page.tsx` | HR module page (list + tabs) |
| `src/app/(dashboard)/hr/new/page.tsx` | New HR request form page |
| `src/app/(dashboard)/maintenance/page.tsx` | Maintenance module page (mock data + coming soon) |
| `src/app/(dashboard)/purchase/page.tsx` | Purchase module page (mock data + coming soon) |
| `src/app/(dashboard)/event/page.tsx` | Event module page (mock data + coming soon) |
| `src/app/(dashboard)/travel/page.tsx` | Travel module page (mock data + coming soon) |
| `src/modules/hr/hr.schema.ts` | Zod schemas for Onboarding & Offboarding |
| `src/modules/hr/HRForm.tsx` | HR create form (Onboarding / Offboarding toggle) |
| `src/components/layout/Sidebar.tsx` | Navigation sidebar |
| `src/lib/mock-data.ts` | Static mock data (legacy shipments, users, roles) |
| `src/modules/shipping/ShippingForm.tsx` | Shipping request form |

---
### Development Loop (Repeat for each module)
1. **Sync Plan:** Update this `CLAUDE.md`.
2. **Define Schema:** Create/Update `Zod` schemas.
3. **Execute:** Write NestJS code & DB migrations.
4. **Verify:** Test against Audit Logs and JSONB validation.
