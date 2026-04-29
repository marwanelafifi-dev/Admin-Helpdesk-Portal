# Admin Request Platform - Product Requirements Document (PRD)

_Last updated: 2026-04-29 — HR create form added_

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
| **New** | Gray | Submitted, awaiting action |
| **On Hold** | Orange | Blocked / awaiting external input |
| **In Transit** | Blue | Actively being processed or shipped |
| **Delivered** | Green | Item or service delivered to requester |
| **Completed** | Emerald | Fully resolved and closed |
| **Cancelled** | Red | Cancelled by user or administrator |

## 5. Feature Modules

| Module | Status | Core Functionality |
| :--- | :--- | :--- |
| **Shipping** | Active | Tracking, PO management, carrier logs, delivery status |
| **HR** | Active | Onboarding (Medical, Access Card, Seating) & Offboarding (Close Medical, Collect Card) |
| **Maintenance** | Upcoming | Ticketing, assignment, resolution tracking |
| **Purchase** | Upcoming | Vendor management, budget tracking, PO approval |
| **Event** | Upcoming | Venue booking, event planning, attendee management |
| **Travel** | Upcoming | Flight/hotel bookings, travel approvals |

## 6. My Requests Page (Unified View)
The "My Requests" page is the central hub for every logged-in user. It:
- Displays **all requests across all modules** scoped to the current user.
- Shows **stats cards** for each status (Total, Draft, New, On Hold, In Transit, Delivered, Completed, Cancelled).
- Provides **dropdown filters** for Status and Module (same design pattern as the Shipping module).
- Uses a **generic table** with columns: Request ID, Request Title, Requester Name, Status, Module.
- Color-codes status and module badges for instant visual identification.

## 7. HR Module (Active)
The HR module handles all administration team requests for employee lifecycle events:

**Onboarding** (for new hires):
- Medical Insurance for New Hire
- Access Card
- Seating Assignment

**Offboarding** (for leavers):
- Close Medical for Leaver
- Collect Access Card

**Statuses:** New → On Hold → Completed  
**Table columns:** Request ID, Type (Onboarding/Offboarding), Employee Name, Employee ID, Department, Items, Date, Status  
**Tabs:** All / Onboarding / Offboarding  
**Mock data:** 6 records (3 onboarding, 3 offboarding) across all three statuses.

**Create flow:**
- "Add HR Request" button on the HR page opens a dropdown to choose Onboarding or Offboarding.
- Each option routes to `/hr/new?type=onboarding` or `/hr/new?type=offboarding`.
- The form pre-selects the correct type and renders the matching fields and checkbox items.
- Validated via Zod; on submit the request is stored with status `"new"` and the user is redirected back to `/hr`.

**Key files:**
- `src/modules/hr/hr.schema.ts` — Zod schemas (`OnboardingPayloadSchema`, `OffboardingPayloadSchema`)
- `src/modules/hr/HRForm.tsx` — Unified form component with Onboarding / Offboarding toggle
- `src/app/(dashboard)/hr/page.tsx` — List page with tabs, stats, filters, and "Add HR Request" button
- `src/app/(dashboard)/hr/new/page.tsx` — New request page (reads `?type` query param)

## 8. Shipping Module (Active)
- Full CRUD for shipment requests via `ShippingForm`.
- Module-specific statuses surfaced in the Shipping page filter: New, On Hold, In Transit, Delivered, Cancelled.
- Stat cards: Total Shipments, On Hold, In Transit, Delivered.
- Carrier filter: DHL, FedEx, UPS, Aramex, TNT, Maersk, USPS.
- All shipments stored as `EngineRequest<ShippingPayload>` via `engineService`.

## 9. Request Engine (`engineService.ts`)
- **Storage:** `localStorage` under key `arp_requests` (swap for Firestore/PostgreSQL when backend is ready).
- **ID format:** `{PREFIX}-{YEAR}-{SEQ}` e.g. `SHP-2026-0001`.
- **Mock data:** `initializeMockData()` seeds 8 sample requests on first load; version-keyed (`arp_mock_version`) to auto-reset stale data on schema changes.
- **Public API:** `submitRequest`, `saveDraft`, `updateStatus`, `getRequests`, `getRequestsByModule`, `getRequestById`, `clearStore`.

## 10. Tech Stack
* **Frontend:** Next.js 14 (App Router), React, Tailwind CSS, shadcn/ui
* **State:** localStorage (mock) → Firestore / PostgreSQL (production)
* **Schema Validation:** Zod
* **Authentication:** Mock RBAC (USR-001 = Marwan Elafifi, Super Admin)

## 11. Future Enhancements
* Workflow automation engine with configurable approval chains
* Notifications & alerts system (email + in-app)
* Advanced analytics dashboard with module-level breakdowns
* API integrations with ERP/NetSuite
* File upload service for AWB, invoices, and receipts
* Mobile application support
* Redis caching for dashboard data

## 12. Success Metrics
* Reduced request processing time per module
* Increased cross-department visibility
* Faster onboarding of new modules (target: < 1 sprint per module)
* Improved user satisfaction and adoption rate