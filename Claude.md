# ROADMAP.md: Admin Request Platform

This document tracks the phased development of the Admin Request Platform, moving from the core engine to full module implementation.

## Phase 1: Foundation (Completed)
- [x] Architecture Planning & Diagramming.
- [x] Core NestJS Request Engine Setup.
- [x] Prisma + PostgreSQL Database Integration.
- [x] Global Dashboard & UI/UX Layout.
- [x] Authentication & RBAC System (Super Admin, Admin, Manager, Requester, Viewer).

## Phase 2: Core Module Implementation (Completed)
- [x] **Dashboard — Professional Analytics Redesign:**
  - [x] Primary KPIs: Total Requests, Active Requests, Completed, Avg Resolution Days — all with trend indicators.
  - [x] Secondary KPIs: Pending Approvals, Overdue Items (7+ days), Cancellation Rate.
  - [x] Status breakdown bar chart (New/On Hold/In Transit/Delivered/Completed/Cancelled).
  - [x] Module distribution pie chart (all 6 modules with color-coded segments).
  - [x] Recent activity stream (10 most recent with timestamps, status badges).
  - [x] Smart alerts panel: overdue count, pending approvals warning, cancellation rate flag, or "All Clear".
  - [x] Trend indicators (up/down arrows) with comparison labels on all KPI cards.
  - [x] Recent Employee Feedback section showing latest feedback comments with ratings.
- [x] **Shipping Module:** Full CRUD, tracking, and status updates.
  - [x] Shipping-specific statuses: New → In Progress → In Customs → Delivered → Cancelled.
  - [x] Carrier filter pills (DHL, FedEx, UPS, Aramex, Other).
  - [x] Stat cards: Total Shipments, On Hold, In Transit, Delivered — clickable, sync with filter.
  - [x] Sortable + resizable dark slate table header. Zebra rows, dot indicators, footer count.
- [x] **My Requests Page (Unified View):**
  - [x] Shows all requests across all modules scoped to the logged-in user (USR-001).
  - [x] 7 clickable stat cards (Total, New, On Hold, In Transit, Delivered, Completed, Cancelled) — highlight in status color when active.
  - [x] Status and Module quick-filter pill rows with per-color active states.
  - [x] Sortable + resizable dark slate table (native `<table>` + `<colgroup>`).
  - [x] Columns: Request ID, Request Title, Submission Date, Module, Status, Last Update Date — all sortable and resizable.
  - [x] Zebra rows, dot indicators, footer count.
  - [x] Sidebar label: "My Requests".
- [x] **All Requests Page (Admin View):**
  - [x] Page at `/admin/all-requests` — shows all requests across all team members.
  - [x] Title: "All Requests"; sidebar item positioned directly after Dashboard.
  - [x] Sidebar active highlight scoped to exact path `/admin/all-requests` (does not bleed into Admin parent item).
  - [x] Overview stat cards: Total Requests, New, On Hold, Completed — clickable.
  - [x] Quick-filter pills for Module (All, Shipping, Maintenance, Purchase, Event, Travel, HR) and Status (All + 6 statuses + Active special filter).
  - [x] Active pill highlights in the matching color per module/status.
  - [x] Sortable + resizable dark slate table. Columns: Request ID, Request Title, Submission Date, Requester Name, Module, Status, Last Update Date.
  - [x] Search by ID, title, or requester name.
  - [x] Team Tasks overview section showing top 5 active tasks with inline status management.
- [x] **HR Module:**
  - [x] Zod schema for Onboarding and Offboarding payloads (`hr.schema.ts`).
  - [x] HR page with All / Onboarding / Offboarding tabs, stat cards, and filtered table.
  - [x] Sortable + resizable dark slate table. Columns: Request ID, Employee ID, Employee Name, Department, Sector, Type, Status, Last Update Date.
  - [x] Statuses: New, On Hold, Completed.
  - [x] Onboarding items: Medical Insurance for New Hire, Access Card, Seating Assignment.
  - [x] Offboarding items: Desk/Office, Farewell, Close Medical for Leaver, Collect Access Card. Offboarding displayed in red.
  - [x] All mock records removed for production v1. Forms create real records via `submitRequest()`.
  - [x] Added to sidebar with `UserCog` icon; teal color in My Requests module filter.
  - [x] `HRForm.tsx` — create form with Onboarding/Offboarding toggle, checkbox items, Zod validation.
  - [x] `/hr/new` page — accepts `?type=onboarding|offboarding` query param to pre-select form type.
  - [x] "Add HR Request" dropdown button (blue-600) on HR page — links directly to Onboarding or Offboarding form.
  - [x] On submit → persists to engine store as `"new"` status → redirects to `/hr`.
  - [x] Onboarding form fields: Employee Name, Employee ID, Mobile Number, National ID Number, Job Title, Employment Type, Direct Manager, Sector, Department, Entity, Start Date, Items, Attachments, Notes.
  - [x] Offboarding form fields: Employee Name, Employee ID, Job Title, Employment Type, Direct Manager, Department, Sector, Last Working Day, Items, Attachments, Notes.
- [x] **Maintenance Module page** — formal redesign + real mock data:
  - [x] 4 clickable stat cards: Total Tickets, New, In Progress, Completed.
  - [x] Status filter pills + search. Sortable + resizable dark slate table.
  - [x] Columns: Request ID, Request Title, Submission Date, Requester Name, Priority (color-coded High/Medium/Low), Status, Last Update Date.
  - [x] Mock records removed. "Coming soon" banner removed. Live with real data.
  - [ ] Define Zod Schema for ticket fields.
  - [ ] Build full create form + NestJS CRUD endpoints.
- [x] **Purchase Module page** — formal redesign:
  - [x] 4 clickable stat cards: Total Orders, New, Pending Approval, Completed.
  - [x] Status filter pills + search. Sortable + resizable dark slate table.
  - [x] Columns: Request ID, Request Title, Submission Date, Requester Name, Supplier, Estimated Price, Last Update Date.
  - [x] Mock records removed. Live with real data.
  - [ ] Define Zod Schema for PO/Budget fields.
  - [ ] Build full create form + NestJS logic + budget calculation.
- [x] **Event Module page** — formal redesign:
  - [x] 4 clickable stat cards: Total Events, Upcoming, Pending, Completed.
  - [x] Status filter pills + search. Sortable + resizable dark slate table.
  - [x] Columns: Request ID, Request Title, Submission Date, Requester Name, Event Date, Attendees, Status, Last Update Date.
  - [x] Mock records removed. Live with real data.
  - [ ] Define Zod Schema + build create form + calendar integration.
- [x] **Travel Module page** — formal redesign:
  - [x] 4 clickable stat cards: Total Trips, Upcoming, On Hold, Completed.
  - [x] Status filter pills + search. Sortable + resizable dark slate table.
  - [x] Columns: Request ID, Request Title, Submission Date, Requester Name, Destination, Travel Date, Status, Last Update Date.
  - [x] Mock records removed. Live with real data.
  - [ ] Define Zod Schema + build booking/approval workflow form.
- [x] **engineService mock data** — removed for production v1. `initializeMockData()` now wipes stale dev data on first boot. `ProductionDataWipe` component clears all localStorage keys on first browser load.

## Phase 2b: Employee Feedback & Satisfaction Surveys (Completed)
- [x] **Automated Feedback Survey System:**
  - [x] Feedback survey triggered automatically 1 hour after request completion.
  - [x] Survey stored via feedbackService with localStorage persistence.
  - [x] Survey types: FeedbackSurvey (id, requestId, requesterEmail, requesterName, requestTitle, module, status: pending/sent/completed).
  - [x] Email notification with survey link (simulated via console.log for now).
- [x] **Public Survey Form:**
  - [x] Public page at `/feedback-survey?id={surveyId}` — no authentication required.
  - [x] Star rating selector (1-5 stars) with visual feedback.
  - [x] Optional comment textarea for detailed feedback.
  - [x] Form validation ensures rating selected before submission.
  - [x] Success message + auto-redirect to dashboard after 3 seconds.
- [x] **Feedback & Reports Dashboard:**
  - [x] Professional page at `/feedback-reports` showing all collected feedback.
  - [x] Summary stats: Total Feedback, Average Rating, Satisfaction Rate, Response Coverage.
  - [x] Module Performance Report with average ratings by department.
  - [x] Employee Feedback list with search and filter capabilities.
  - [x] Date range filtering: Last 7 Days, Last 30 Days, Last 90 Days, All Time.
  - [x] Rating filter buttons (5★, 4★, 3★, 2★, 1★).
  - [x] Recent Employee Feedback section added to main dashboard (up to 5 latest).
  - [x] Comment count display with ratings and timestamps.

## Phase 2c: Team Tasks & Administration Collaboration (Completed)
- [x] **Team Tasks Management Page:**
  - [x] Dedicated page at `/tasks` for admin team task management.
  - [x] Role-based access: only "Administration Team" role members appear in assignee dropdown.
  - [x] Assignee dropdown fetches real users from `/api/users/assignable` (filters by `page:tasks` permission).
  - [x] Task statuses: todo, in_progress, in_review, completed, cancelled.
  - [x] Create form with title, description, team member dropdown, optional attachments.
  - [x] Task statistics dashboard (Total, To Do, In Progress, In Review, Completed).
  - [x] Search and status filter capabilities.
  - [x] Expandable task detail view showing:
    - [x] Comments section with author, timestamp, optional attachments.
    - [x] Activity tab showing all task history (creation, status changes, comments, attachments).
    - [x] Attachments section showing all task files.
    - [x] Inline status dropdown for quick status updates.
- [x] **Task Comments with Attachments:**
  - [x] Comment input form in expanded task view.
  - [x] File attachment support for comments with add/remove UI.
  - [x] Attachment preview with download links.
  - [x] Files stored as data URLs for localStorage persistence.
- [x] **Task Creation Attachments:**
  - [x] Optional file attachment support during task creation.
  - [x] Attachment preview and removal UI in form.
  - [x] Multiple file upload support.
- [x] **Team Tasks Integration:**
  - [x] Active Team Tasks section on All Requests page (top, shown once — duplicate "Team Tasks Overview" removed).
  - [x] Top 5 active tasks displayed in card format with inline status dropdown.
  - [x] "Manage All" button linking to full tasks page.
  - [x] Sidebar navigation item "Team Tasks" positioned after Feedback & Reports.

## Phase 2d: UX Enhancements (Completed)
- [x] **Comment Activity Tab:** Shows comment history in request detail view with author, timestamp, and content.
  - [x] Comment creation with optional text attachments (data URLs).
  - [x] Comment editing and deletion.
  - [x] Attachment preview with download support.
- [x] **Unread Comment Indicators:** Visual badges and row highlighting across all request list pages.
  - [x] Comment count badge next to request ID.
  - [x] Red badge for unread comments, blue badge for read comments.
  - [x] Light blue row highlight when unread comments exist.
  - [x] Auto-mark comments as viewed when request detail page loads.
  - [x] Implemented on: My Requests, Shipping, Shipping Receiving, HR, Maintenance, Purchase, Event, Travel, Admin All Requests pages.

## Phase 2e: Status System Updates (Completed)
- [x] **Removed Draft Status:**
  - [x] Removed "Draft" from all status displays across Dashboard, My Requests, All Requests pages.
  - [x] Updated status constants (STATUS_LABELS, STATUS_COLORS, STATUS_DOT) to exclude draft.
  - [x] Removed draft from STATUSES arrays and stat card displays.
  - [x] Unified status model now: New, On Hold, In Progress, Delivered, Completed, Cancelled.
  - [x] Module-specific statuses maintained: Shipping (new/in_progress/in_customs/delivered/cancelled), HR (new/on_hold/completed), etc.

## Phase 2f: Request List & Interaction Enhancements (Completed)
- [x] **Inline Status Editing:** Change request status directly from the list row without navigating to detail view.
  - [x] `InlineStatusSelect` component — clickable badge opens a dropdown of allowed statuses per module.
  - [x] Module-aware status lists: Shipping (new/in_customs/delivered/cancelled), HR (new/on_hold/completed), Maintenance (new/on_hold/completed/cancelled), Purchase (new/in_customs/on_hold/delivered/cancelled), Event/Travel (new/on_hold/in_transit/delivered/completed/cancelled).
  - [x] Optimistic UI update + `updateStatus()` persistence via engineService.
  - [x] Last Update Date refreshed automatically on status change.
  - [x] Implemented on: Shipping, HR, Maintenance, Purchase, Event, Travel, All Requests (module-aware), My Requests.
- [x] **Three-dot Action Menus:** `RequestActionsMenu` component on all module list rows.
  - [x] Actions: View Details (inline expand), Edit (links to module form).
  - [x] Chevron indicator on row when expanded.
  - [x] Implemented on all module pages + All Requests (module-specific form routing).
- [x] **Inline Row Expansion:** Click "View Details" to expand a row in-place showing request details.
  - [x] `useExpandedRows` hook managing expand/collapse state per request ID.
  - [x] Light blue `bg-blue-50` expansion row with grid layout showing key fields.
  - [x] Purchase expansion shows Product URL as clickable hyperlink.
  - [x] Implemented on: Shipping, HR, Maintenance, Purchase, Event, Travel, All Requests.
- [x] **Form Submissions Enabled:** All module forms now persist via `submitRequest()` from engineService.
  - [x] Maintenance, Purchase, HR (Onboarding + Offboarding) forms: fully working submit.
  - [x] Event, Travel forms: submit wired but button shows "Coming Soon" (disabled).
- [x] **Full-Width Table Layout:** Tables extend edge-to-edge inside their Card containers.
  - [x] `-mx-6 px-6 -mb-6` wrapper pattern applied to all module table cards.
  - [x] `bg-slate-800` moved to `<thead>` element (not `<tr>`) for full-width dark header.
  - [x] Filler `<col /><th className="bg-slate-800" />` ensures header bg fills remaining space.
- [x] **Auto-Sizing Columns:** Columns size to content by default; user can resize manually.
  - [x] `colWidths` initialized as `null[]` — no fixed pixel widths on first load.
  - [x] `tableLayout` switches to `"fixed"` only after user drags a column header.
  - [x] Resize handler reads actual rendered DOM width via `getBoundingClientRect()` at drag start.
  - [x] Applied to all module pages: Shipping, Receiving, HR, Maintenance, Purchase, Event, Travel, All Requests, My Requests.
- [x] **Stat Card Consistency:** All module pages use identical stat card style.
  - [x] `rounded-xl p-5`, `h-11 w-11` icon, `text-sm` label, `text-2xl font-bold` value, `gap-4` grid.
  - [x] Purchase page fixed to match standard (was using compact `p-3` / `text-xl` / `h-8 w-8` style).
  - [x] Purchase stat cards forced to single row (`grid-cols-5`).
- [x] **Google Fonts Removed:** Replaced `next/font/google` Inter with system font stack to avoid certificate errors in restricted network environments.

## Phase 3: Production v1.0 (Completed — 14 May 2026)
- [x] **Mock Data Removal:** All hardcoded mock requests removed from `engineService.ts` and `mock-data.ts`. Only real users in `data/users.json` are kept.
- [x] **Production Data Wipe:** `ProductionDataWipe` component clears all stale localStorage keys on first browser load (version key: `arp_prod_wipe_v1`).
- [x] **Notifications System:**
  - [x] Bell dropdown shows recent notifications with unread count badge.
  - [x] Notification settings gear inside dropdown header → `/notifications/settings`.
  - [x] "View all notifications" → `/notifications` (full log page with All/Unread filter, mark-all-read).
  - [x] Clicking any notification navigates to the related request.
- [x] **Admin Pages — Audit Trail:** Page at `/admin/audit-trail` showing all system events (request creation, status changes, comments, task activity). Filter by category + search.
- [x] **Admin Pages — Database:** Page at `/admin/database` with:
  - [x] **Backup** — one-click JSON download of all localStorage stores (requests, tasks, feedback, notifications, config).
  - [x] **Restore** — upload backup JSON file to restore all data; warns before overwriting.
- [x] **Role Permissions Updated:**
  - [x] `Administration Team` role: added `page:feedback-reports`, `page:hr-new` permissions.
  - [x] `Full Access` role: added `page:admin-audit`, `page:admin-database` permissions.
  - [x] `ADMIN_TEAM_ROLES` in taskService updated to `["Administration Team", "Full Access"]`.
- [x] **Task Assignee Dropdown:** Fetches real users from `/api/users/assignable` filtered by `page:tasks` permission. Shows only "Administration Team" members. Role validation check removed (dropdown already restricts).
- [x] **Feedback & Reports:** Stats show `—` instead of `0` when no feedback data exists.
- [x] **Maintenance Module:** "Coming soon" banner removed.
- [x] **All Requests Page:** Duplicate "Team Tasks Overview" section removed — Active Team Tasks shown once at top.
- [x] **Sidebar:** Added Audit Trail and Database entries under Admin group with correct icons.

## Phase 4: Docker Containerization (Completed — 15 May 2026)
- [x] **Two-Container Deployment (admin-helpdesk):**
  - [x] `admin-helpdesk-app` — Next.js app container on port 3003.
  - [x] `admin-helpdesk-db` — PostgreSQL 16 database container on port 5432.
  - [x] Isolated `helpdesk-net` bridge network (172.25.0.0/16) — app and db only, no external container access.
  - [x] Docker Compose project name: `admin-helpdesk`. Services visible as a group in Docker Desktop.
  - [x] Environment variable configuration via `.env.local`.
  - [x] Health checks on both containers. App served at `http://localhost:3003`.
  - [x] `docker-entrypoint.sh` — waits for DB readiness via netcat, runs `prisma db push`, starts `next start`.
- [x] **Docker Desktop Windows Fix:**
  - [x] Disabled `UseContainerdSnapshotter` in Docker Desktop settings — was causing gRPC EOF errors during layer export.
  - [x] Build strategy: run `npm run build` locally first (outputs to `.next-dev`), then COPY pre-built output into image — avoids long build steps inside Docker that trigger pipe timeouts.
  - [x] Removed `.next-dev` from `.dockerignore` so pre-built output is included in build context.
  - [x] Copied `next.config.ts` into container so `next start` picks up `distDir: ".next-dev"` at runtime.
  - [x] Entrypoint uses `next start` directly (not `npm start`) to respect `next.config.ts` at runtime.
- [x] **Cloudflare Tunnel (ready, not activated):**
  - [x] `tunnel` service added to `docker-compose.yml` under `profiles: [tunnel]`.
  - [x] Start with: `docker compose --profile tunnel up -d` after setting `CLOUDFLARE_TUNNEL_TOKEN` in `.env.local`.
- [x] **Ubuntu Deployment Notes:**
  - [x] On Linux, `UseContainerdSnapshotter` is not an issue — standard `docker compose up --build -d` works.
  - [x] No pre-build step needed on Ubuntu; `npm run build` inside Docker completes without timeout.

## Phase 5: Production v1.1 — CC Recipients, Permissions & Email (Completed — 15 May 2026)
- [x] **CC Recipients Panel:**
  - [x] CC panel visible on Comments tab for all authenticated users (any role).
  - [x] New `manage_cc` permission added to all roles in `data/roles.json`.
  - [x] `manage_cc` toggleable per-role from Admin → Roles UI.
  - [x] CC panel always renders; add/remove gated on `manage_cc` permission + `sessionStatus === "authenticated"`.
- [x] **Role & User Data Fixes:**
  - [x] `data/users.json`: Full Access user role corrected from `super_admin` → `Full Access`; Requester user corrected from `requester` → `Requester`.
  - [x] `fallbackRoles` and `ROLE_COLORS` in admin users page updated to match real role names.
  - [x] Admin users page Change Role submenu now shows only real roles from `roles.json`.
- [x] **Middleware Hardening:**
  - [x] Added missing page permissions: `page:admin-roles`, `page:admin-audit`, `page:admin-database`, `page:admin-notifications`.
  - [x] `isSuperAdmin` check now matches both `"super_admin"` and `"Full Access"` role names.
- [x] **Email Config Persistence:**
  - [x] `src/lib/emailConfig.ts` — reads/writes `data/email-config.json`.
  - [x] `/api/notifications/config` GET+POST endpoint — saves config server-side.
  - [x] `emailService.ts` reads saved UI config first, falls back to `.env.local`.
  - [x] Admin → Notifications page: loads config from server on mount, saves to server on "Save Configuration".
  - [x] Email config survives container restarts (persisted to `data/email-config.json`).
- [x] **API Path Fix:**
  - [x] `src/lib/apiClient.ts`: all comments endpoints now use `API_BASE` constant instead of hardcoded `/api`.

## Phase 5b: UI & Settings Fixes (Completed — 15 May 2026)
- [x] **Form Footer White Box Fix:** Removed `sticky bottom-0` and `pb-12` from all module form wrappers (Shipping, HR ×2, Maintenance, Purchase, Event, Travel). Cancel/Submit bar is now a static `border-t bg-gray-50` footer — no floating white box at scroll end.
- [x] **Separate Logo Management:**
  - [x] Two independent logo slots: Header logo (`arp_logo_header`) and Login page logo (`arp_logo_login`).
  - [x] Each has its own upload block in Admin → Settings with clickable preview, Upload button, and Restore Default.
  - [x] Header logo read by `TopBar.tsx`; login logo read by `login/page.tsx`.
  - [x] Previously both shared one key `arp_custom_logo` — now fully independent.

## Phase 6: Advanced Functionality (Pending)
- [ ] **Email Notifications:** SMTP ports 465/587 may be blocked by corporate firewall. Use Admin → Notifications to configure Gmail App Password or switch to SendGrid/Brevo (HTTP API, not blocked).
- [ ] **Audit Trail Enhancement:** Currently reads from localStorage. Future: persist to PostgreSQL for cross-session history.
- [ ] **Database Backup:** Currently localStorage-only. Future: server-side PostgreSQL dump endpoint.

## Phase 6: Optimization & Scaling
- [ ] Add Redis caching for frequently accessed dashboard data.
- [ ] Implement file upload storage service for AWB/Invoices/Receipts.
- [ ] Performance audit on polymorphic JSONB queries.
- [ ] Load testing and optimization for high-volume request processing.

---

## UI Design System (All Pages — Consistent Pattern)
Every module page follows the same formal layout:
1. **Header** — page title + subtitle + action button (blue-600).
2. **Stat cards** — clickable `rounded-xl border-2 p-5` cards with `h-11 w-11` icon, `text-sm` label, `text-2xl font-bold` value; active card fills in its color; synced with status filter.
3. **Table card** — `<Card>` with `-mx-6 px-6 -mb-6` wrapper; `<CardHeader>` containing search input + status filter pills.
4. **Table** — native `<table>` with `tableLayout: auto` by default (columns size to content), switches to `tableLayout: fixed` after user manually resizes; `<thead className="bg-slate-800">` + filler `<col /><th className="bg-slate-800" />` ensures full-width dark header; drag handles on each `<th>` for resizing; zebra rows; dot + badge status indicators; footer count.
5. **Inline actions** — three-dot `RequestActionsMenu` on each row: View Details (expands row in-place) + Edit (links to form).
6. **Inline status editing** — `InlineStatusSelect` badge on Status column; dropdown shows module-specific allowed statuses; updates optimistically + persists via `updateStatus()`.

## Standardized Table Column Structure (All Modules)
All module pages follow a consistent column ordering for professional appearance:
| Column | Type | Notes |
|--------|------|-------|
| Request ID | Primary Key | Unique identifier for each request |
| Request Title | Text | User-entered request title/description |
| Submission Date | Date | createdAt timestamp, formatted DD-MMM-YYYY |
| Requester Name | Text | Name of the user who submitted the request |
| Module-Specific Cols | Varies | Supplier (Purchase), Priority (Maintenance), Event Date (Event), Destination (Travel), Employee ID (HR), etc. |
| Status | Badge | Color-coded status with dot indicator (only non-formal styling) |
| Last Update Date | Date | updatedAt timestamp, formatted DD-MMM-YYYY |

All data cells use: `text-sm font-medium text-gray-700` for formal, consistent appearance.
Status column preserves color styling with dot indicators; other columns use neutral gray text.

## Unified Status Model (All Modules)
| Status | Color | Meaning |
|--------|-------|---------|
| New | Sky | Submitted, awaiting action |
| On Hold | Amber | Blocked / awaiting external input |
| In Progress | Blue | Actively being processed |
| Delivered | Green | Item/service delivered |
| Completed | Emerald | Fully resolved and closed |
| Cancelled | Red | Cancelled by user or admin |

**Module-Specific Status Variations:**
- **Shipping:** new, in_progress, in_customs, delivered, cancelled
- **HR:** new, on_hold, completed
- **Maintenance:** new, on_hold, completed, cancelled
- **Purchase:** new, in_customs, on_hold, delivered, cancelled (with "awaiting_approval" as on_hold variant)
- **Event/Travel:** new, on_hold, in_transit, delivered, completed, cancelled

## Statistics & Metrics Tracked on Dashboard
- **Total Requests:** Count across all modules and statuses.
- **Active Requests:** Count of requests in New, On Hold, or In Transit status.
- **Completed Requests:** Count of requests in Completed status.
- **Average Resolution Time:** Mean days from creation to completion.
- **On-Time Completion Rate:** % of completed requests (baseline metric).
- **Pending Approvals:** Count of New + On Hold requests.
- **Overdue Items:** Count of requests pending for 7+ days (not Completed/Cancelled/Delivered).
- **Cancellation Rate:** % of cancelled requests out of total.
- **Module Breakdown:** Count per module (Shipping, Maintenance, Purchase, Event, Travel, HR).
- **Status Distribution:** Count per status across all modules.

## Key Files & Services

### Core Services
| File | Purpose | Key Features |
|------|---------|--------------|
| `src/services/engineService.ts` | Core request engine | Mock data seed (v7), polymorphic JSONB payload, CRUD operations |
| `src/services/feedbackService.ts` | Employee feedback surveys | FeedbackSurvey lifecycle, auto-send with 1-hour delay, rating collection |
| `src/services/taskService.ts` | Team task management | Task CRUD, comment threading, attachments, activity logging |

### Dashboard & Analytics
| File | Purpose | Key Features |
|------|---------|--------------|
| `src/app/(dashboard)/dashboard/page.tsx` | Main analytics dashboard | KPIs, charts, alerts, trend indicators, feedback section |
| `src/app/(dashboard)/feedback-reports/page.tsx` | Feedback analytics | Summary stats, module performance, date/rating filters |

### Request List Pages
| File | Purpose | Key Features |
|------|---------|--------------|
| `src/app/(dashboard)/requests/page.tsx` | My Requests unified view | User-scoped requests, status/module filters, sortable table |
| `src/app/(dashboard)/admin/all-requests/page.tsx` | All Requests admin view | All team requests, search, filters, team tasks integration |

### Module Pages
| File | Purpose | Key Features |
|------|---------|--------------|
| `src/app/(dashboard)/shipping/page.tsx` | Shipping module | Status: new/in_progress/in_customs/delivered/cancelled |
| `src/app/(dashboard)/shipping/receiving/page.tsx` | Shipping Receiving submodule | Receiving-specific workflow |
| `src/app/(dashboard)/hr/page.tsx` | HR module (list + tabs) | Onboarding/Offboarding tabs, status: new/on_hold/completed |
| `src/app/(dashboard)/hr/new/page.tsx` | HR form page | Form with type query param support |
| `src/app/(dashboard)/maintenance/page.tsx` | Maintenance module | Priority filtering, status: new/on_hold/completed/cancelled |
| `src/app/(dashboard)/purchase/page.tsx` | Purchase module | Supplier/price display, status: new/in_customs/on_hold/delivered/cancelled |
| `src/app/(dashboard)/event/page.tsx` | Event module | Event date/attendees display, full status lifecycle |
| `src/app/(dashboard)/travel/page.tsx` | Travel module | Destination/date display, full status lifecycle |

### Admin Tools
| File | Purpose | Key Features |
|------|---------|--------------|
| `src/app/(dashboard)/tasks/page.tsx` | Team Tasks management | Administration Team role only, real assignee from API, comment attachments, activity tracking |
| `src/app/(dashboard)/admin/audit-trail/page.tsx` | Audit Trail | Reads localStorage, shows all events by category with search/filter |
| `src/app/(dashboard)/admin/database/page.tsx` | Database Backup/Restore | JSON export of all stores, file upload restore with overwrite warning |
| `src/app/(dashboard)/notifications/page.tsx` | Notification log | All/Unread filter, mark-all-read, click to navigate to request |
| `src/app/(dashboard)/notifications/settings/page.tsx` | Notification preferences | Per-user email/in-app toggle settings |
| `src/app/api/users/assignable/route.ts` | Assignable users API | Returns users whose role has `page:tasks` permission |
| `src/components/layout/ProductionDataWipe.tsx` | Production data wipe | Clears stale localStorage on first boot (key: `arp_prod_wipe_v1`) |

### Components & Utilities
| File | Purpose | Key Features |
|------|---------|--------------|
| `src/components/layout/Sidebar.tsx` | Navigation sidebar | Module nav, active state highlighting, collapsible groups |
| `src/components/ui/InlineStatusSelect.tsx` | Inline status dropdown | Module-aware status list, optimistic update, chevron indicator |
| `src/components/ui/RequestActionsMenu.tsx` | Three-dot row action menu | View Details (expand), Edit (form link) |
| `src/hooks/useExpandedRows.ts` | Row expansion state hook | `toggleRow()`, `isExpanded()` per request ID |
| `src/modules/hr/HRForm.tsx` | HR create form | Toggle-based type selection, checkbox items, validation |
| `src/modules/shipping/ShippingForm.tsx` | Shipping form | Carrier selection, full field validation |

---
### Development Loop (Repeat for each module)
1. **Sync Plan:** Update this `CLAUDE.md`.
2. **Define Schema:** Create/Update `Zod` schemas.
3. **Execute:** Write NestJS code & DB migrations.
4. **Verify:** Test against Audit Logs and JSONB validation.
