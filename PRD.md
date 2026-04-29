# Admin Request Platform - Product Requirements Document (PRD)

_Last updated: 2026-04-29 — Dashboard redesigned with professional analytics; all module pages use formal table style; 34 mock records seeded across all modules_

## 1. Executive Summary
The Admin Request Platform is a unified, scalable system designed to centralize diverse administrative request workflows into a single, manageable interface. It enables organizations to streamline operations across multiple domains — Shipping, Maintenance, Purchase, Events, and Travel — improving efficiency, visibility, and control for every user.

## 2. Core Objectives
* **Unified Architecture:** Standardize request submission, tracking, and approval workflows across all modules under a single `EngineRequest` model.
* **Extensibility:** Enable rapid deployment of new modules using a polymorphic `payload` (JSONB) pattern.
* **RBAC Control:** Provide granular role-based access for users, managers, and administrators.
* **User-Centric View:** Every user sees only their own requests aggregated across all modules in the "My Requests" page.

## 3. User Roles
| Role | Description |
| :--- | :--- |
| **Super Admin** | Full system configuration and user management |
| **Admin** | Manages requests and module-specific settings |
| **Manager** | Approves/rejects business-critical requests |
| **Requester** | Submits and tracks own requests |
| **Viewer** | Read-only access for monitoring |

## 4. Unified Status Model
All modules share the same status lifecycle:

| Status | Color | Description |
| :--- | :--- | :--- |
| **Draft** | Zinc | Saved but not yet submitted |
| **New** | Sky | Submitted, awaiting action |
| **On Hold** | Amber | Blocked / awaiting external input |
| **In Transit** | Blue | Actively being processed or shipped |
| **Delivered** | Green | Item or service delivered to requester |
| **Completed** | Emerald | Fully resolved and closed |
| **Cancelled** | Red | Cancelled by user or administrator |

## 5. UI Design System (All Module Pages)
Every module page follows a consistent formal layout:
1. **Header** — page title + subtitle + action button (blue-600, disabled for upcoming modules).
2. **Stat cards** — 4 clickable `rounded-xl border-2` cards; active card fills in its accent color; clicking filters the table.
3. **Table card** — `<Card>` with `<CardHeader>` containing: search input + status filter pills + any module-specific secondary filter row (e.g., carrier, type tab).
4. **Table** — Native `<table>` with `tableLayout: fixed`, `<colgroup>` for resizable columns, dark slate (`bg-slate-800`) header with sort icons (ChevronUp/Down/ChevronsUpDown) and resize drag handles, zebra alternating rows, dot + badge status indicators, footer count bar.

## 6. Dashboard Page (Active)
The executive-facing dashboard provides real-time analytics and insights:

**Primary KPIs** (4 cards with trend indicators):
- Total Requests (all modules) — shows on-time completion %
- Active Requests — shows % of total (New, On Hold, In Transit)
- Completed — shows trend (this week)
- Avg Resolution Days — shows trend vs last month

**Secondary KPIs** (3 cards):
- Pending Approvals — breakdown by New status
- Overdue Items — requests pending 7+ days
- Cancellation Rate — % cancelled with trend

**Analytics Charts**:
- **Status Breakdown Bar Chart** — count per status (Draft, New, On Hold, In Transit, Delivered, Completed, Cancelled)
- **Module Distribution Pie Chart** — count per module (Shipping, Maintenance, Purchase, Event, Travel, HR) with color coding

**Activity & Alerts**:
- **Recent Activity Stream** — 10 most recent requests with timestamp, status badge, request ID
- **Smart Alerts Panel** — contextual warnings:
  - Overdue count (7+ days pending)
  - Pending approvals warning (if > 5)
  - Cancellation rate flag (if > 10% of total)
  - "All Clear" status (if no critical alerts)

**Trend Indicators**: Up/down arrows on all KPI cards show comparison to baseline (previous period, industry benchmarks).

## 7. Feature Modules

| Module | Status | Core Functionality |
| :--- | :--- | :--- |
| **Shipping** | Active | Tracking, PO management, carrier logs, delivery status |
| **HR** | Active | Onboarding (Medical, Access Card, Seating) & Offboarding (Close Medical, Collect Card) |
| **Maintenance** | Upcoming | Ticketing, assignment, resolution tracking |
| **Purchase** | Upcoming | Vendor management, budget tracking, PO approval |
| **Event** | Upcoming | Venue booking, event planning, attendee management |
| **Travel** | Upcoming | Flight/hotel bookings, travel approvals |

## 7. My Requests Page (Unified View)
The "My Requests" page is the central hub for every logged-in user. It:
- Displays **all requests across all modules** scoped to the current user (USR-001).
- Shows **8 clickable stat cards** (Total, Draft, New, On Hold, In Transit, Delivered, Completed, Cancelled) — each highlights in its status color when active and filters the table.
- Provides **Status filter pills** and **Module filter pills** — same design pattern as all other module pages.
- Uses a **sortable + resizable table** (native `<table>` + `<colgroup>`) with dark slate header.
- Columns: Request ID, Title, Submitted, Module (dot + colored label), Status (dot + badge), Updated.
- Color-codes status and module badges for instant visual identification.

## 8. All Requests Page (Admin View)
A dedicated admin page at `/admin/all-requests` that shows every request submitted across all team members:
- Sidebar item positioned directly after **Dashboard**, highlighted only on exact path match (does not activate Admin parent).
- Page title: **"All Requests"**.
- **Overview stat cards:** Total Requests, New, On Hold, Completed — clickable.
- **Quick-filter pills:**
  - Module row: All · Shipping · Maintenance · Purchase · Event · Travel · HR
  - Status row: All · Active · Draft · New · On Hold · In Transit · Delivered · Completed · Cancelled — "Active" excludes Cancelled, Completed, Delivered.
  - Each pill highlights in its module/status color when active.
- **Search** by Request ID, title, or requester name.
- **Sortable + resizable table.** Columns: Request ID, Title, Requester (name + email), Module, Status, Last Updated.

## 10. HR Module (Active)
**Onboarding** (for new hires): Medical Insurance for New Hire · Access Card · Seating Assignment

**Offboarding** (for leavers) — displayed in **red**: Close Medical for Leaver · Collect Access Card

**Statuses:** New → On Hold → Completed  
**Table columns:** Request ID, Type (Onboarding/Offboarding), Employee Name, Employee ID, Department, Items, Date, Status  
**Tabs:** All / Onboarding / Offboarding  
**Mock data:** 6 personal records (3 onboarding, 3 offboarding) + 2 team records.

**Create flow:**
- "Add HR Request" button (blue-600) opens a dropdown → Onboarding or Offboarding.
- Routes to `/hr/new?type=onboarding` or `/hr/new?type=offboarding`.
- Validated via Zod; on submit stores as `"new"` status → redirects to `/hr`.

**Key files:**
- `src/modules/hr/hr.schema.ts` — Zod schemas
- `src/modules/hr/HRForm.tsx` — Unified form component
- `src/app/(dashboard)/hr/page.tsx` — List page
- `src/app/(dashboard)/hr/new/page.tsx` — New request page

## 11. Shipping Module (Active)
- Full CRUD for shipment requests via `ShippingForm`.
- Stat cards: Total Shipments, On Hold, In Transit, Delivered — clickable.
- Carrier filter pills: DHL, FedEx, UPS, Aramex, Other.
- Sortable + resizable table. Columns: Request ID, Requester, Tracking Number, Carrier, Delivery Date, Status.
- All shipments stored as `EngineRequest<ShippingPayload>` via `engineService`.

## 12. Maintenance Module (Upcoming — UI Ready)
- 4 clickable stat cards: Total Tickets, New, In Progress, Completed.
- Status filter pills + search. Sortable + resizable table.
- Columns: Request ID, Title, Priority (High/Medium/Low color-coded), Status, Last Updated.
- 5 mock records seeded. "Coming soon" message shown below table.
- **Pending:** Zod schema, create form, NestJS CRUD endpoints.

## 13. Purchase Module (Upcoming — UI Ready)
- 4 clickable stat cards: Total Orders, New, Pending Approval, Completed.
- Status filter pills + search. Sortable + resizable table.
- Columns: Request ID, Title, Supplier, Budget ($), Status, Last Updated.
- 4 mock records seeded. "Coming soon" message shown below table.
- **Pending:** Zod schema, create form, NestJS logic + budget calculation.

## 14. Event Module (Upcoming — UI Ready)
- 4 clickable stat cards: Total Events, Upcoming, Pending, Completed.
- Status filter pills + search. Sortable + resizable table.
- Columns: Request ID, Title, Event Date, Attendees, Status, Last Updated.
- 4 mock records seeded. "Coming soon" message shown below table.
- **Pending:** Zod schema, create form, calendar integration.

## 15. Travel Module (Upcoming — UI Ready)
- 4 clickable stat cards: Total Trips, Upcoming, On Hold, Completed.
- Status filter pills + search. Sortable + resizable table.
- Columns: Request ID, Title, Destination, Travel Date, Status, Last Updated.
- 5 mock records seeded. "Coming soon" message shown below table.
- **Pending:** Zod schema, create form, booking/approval workflow.

## 16. Request Engine (`engineService.ts`)
- **Storage:** `localStorage` under key `arp_requests` (swap for Firestore/PostgreSQL when backend is ready).
- **ID format:** `{PREFIX}-{YEAR}-{SEQ}` e.g. `SHP-2026-0001`.
- **Mock data version:** `v7` — seeds on first load; auto-resets stale data on version change.
- **Mock record counts:** 8 SHP · 5 MNT · 4 PRC · 4 EVT · 5 TRV · 8 HR = 34 total records.
- **Public API:** `submitRequest`, `saveDraft`, `updateStatus`, `getRequests`, `getRequestsByModule`, `getRequestById`, `clearStore`.

## 17. Tech Stack
* **Frontend:** Next.js 14 (App Router), React, Tailwind CSS, shadcn/ui
* **State:** localStorage (mock) → Firestore / PostgreSQL (production)
* **Schema Validation:** Zod
* **Authentication:** Mock RBAC (USR-001 = Marwan Elafifi, Super Admin)

## 18. Future Enhancements
* Workflow automation engine with configurable approval chains
* Notifications & alerts system (email + in-app)
* Advanced analytics dashboard with module-level breakdowns
* API integrations with ERP/NetSuite
* File upload service for AWB, invoices, and receipts
* Mobile application support
* Redis caching for dashboard data

## 19. Success Metrics
* Reduced request processing time per module
* Increased cross-department visibility
* Faster onboarding of new modules (target: < 1 sprint per module)
* Improved user satisfaction and adoption rate
