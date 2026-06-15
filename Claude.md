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

## Phase 5c: General Request Module (Completed — 18 May 2026)
- [x] **General Request Module:**
  - [x] New module added after HR in sidebar with `Inbox` icon (indigo color theme).
  - [x] List page at `/general` — 5 stat cards, sortable/resizable dark slate table, InlineStatusSelect, RequestActionsMenu, comment counts, row expansion.
  - [x] Statuses: New, In Progress, Completed, Cancelled.
  - [x] Create form at `/general/new` — Title (required) + Description + Attachments (base64 data URLs). Centered `max-w-3xl mx-auto`.
  - [x] Added `"general"` to `RequestModule` union in `engineService.ts`, `MODULE_PREFIX` map (`GEN`).
  - [x] Added to All Requests filters, My Requests filters, Database page backup/restore/clear sections.
  - [x] Permissions `page:general` and `page:general-new` added to middleware and all 4 roles in `data/roles.json`.
  - [x] `isSuperAdmin()` in `access.ts` updated to match `"Full Access"` first (was only matching `"super_admin"`).

## Phase 5d: Dark Mode (Completed — 18 May 2026)
- [x] **Dark Mode & Theme Toggle:**
  - [x] `next-themes@0.4.6` installed. `ThemeProvider` wraps entire app in `layout.tsx`.
  - [x] Sun/Moon toggle button in `TopBar.tsx` (left of bell icon). Theme persists via `localStorage` key `arp_theme`.
  - [x] CSS variables for dark palette in `globals.css` (`.dark` block) — professional navy-gray (`220 16%`) base.
  - [x] Global dark-mode overrides in `globals.css` for all hardcoded Tailwind classes (`bg-white`, `bg-gray-50/100`, `text-gray-900/700/600/500`, `border-gray-*`, colored panels).
  - [x] Dashboard charts (bar + pie) use dynamic `chartAxisColor`, `chartGridColor`, `chartTooltipBg` from `useTheme()`.
  - [x] `tailwind.config.ts` already had `darkMode: ["class"]` — no change needed.
  - [x] Dashboard layout wrapper changed from `bg-gray-50` → `bg-background`; TopBar from `bg-white` → `bg-background`.

## Phase 5e: Admin Company Data (Completed — 18 May 2026)
- [x] **Company Data Admin Page** at `/admin/company-data`:
  - [x] Manages 6 lookup tables: **Suppliers**, **Cost Centers**, **Managers**, **Carriers**, **Departments**, **Sectors**.
  - [x] localStorage store at `src/lib/companyDataStore.ts` — key `arp_company_data`. Defaults seed from previous hardcoded values. Empty arrays are preserved (uses `Array.isArray` check, not `??`).
  - [x] Per-section UI: inline add input, delete button (hover to reveal), Import (.csv/.xlsx/.xls), Export (.csv).
  - [x] CSV import: plain JS split by newline + first column. XLSX import: uses `xlsx` package (already installed). Deduplicates on import, shows status message.
  - [x] Sidebar entry "Company Data" (Building2 icon) added under Admin group, between Notifications and Audit Trail.
  - [x] Permission: reuses `page:admin-database`. Added to `middleware.ts`.
- [x] **All Shipping dropdowns now read from Company Data store (no hardcoded fallback to mockUsers):**
  - [x] `ShippingForm.tsx` — Supplier, Cost Center, Carrier, Direct Manager all load from `getList()`.
  - [x] `mapApprovers()` updated — manager id is now the name string (no mockUsers lookup needed).
  - [x] `shipping/page.tsx` and `shipping/receiving/page.tsx` — carrier filter pills load from `getList("carriers")`.
- [x] **HR Direct Manager dropdowns read from Company Data store:**
  - [x] `HRForm.tsx` — both Onboarding and Offboarding `directManager` changed from free-text Input → Select dropdown, populated from `getList("managers")`.
- [x] **Password Reset fixed:**
  - [x] `api/users/[id]/reset-password/route.ts` — was a stub; now hashes with `bcrypt` and calls `updateUser()`.
  - [x] Verifies current password with `bcrypt.compare` before allowing own-password change.
  - [x] Admin (Full Access) resetting another user's password bypasses current-password check.
  - [x] `account/settings/page.tsx` — sends `currentPassword` in request body.
- [x] **Roles page edit dialog widened** (`max-w-4xl`) — page access in 3-column grid, permissions in 4-column grid, no scroll needed.
- [x] **Audit Trail** — actor column resolves USR-* IDs to real display names via `buildUserMap()`.
- [x] **All `super_admin` references replaced with `Full Access`** across `userRoles.ts`, `rolesStore.ts`, `profile/page.tsx`, `access.ts`.

## Phase 5f: Polish & Branding (Completed — 18 May 2026)
- [x] **App renamed to "Admin Helpdesk Portal":**
  - [x] `src/app/layout.tsx` metadata title + description updated.
  - [x] `admin/settings/page.tsx` DEFAULTS: `platformName`, `loginTitle` both updated to "Admin Helpdesk Portal".
  - [x] Email test route updated.
- [x] **Favicon:** New headset SVG (`public/favicon.svg`) — blue circle with headset icon. Linked via `metadata.icons` in `layout.tsx`.
- [x] **General Request form — CC Notifications:** Added `CcEmailsField` card between Description and Attachments. `ccEmails` state passed into `submitRequest` payload and `createRequestUpdateNotifications`. Restores CC list when editing.
- [x] **Database page — complete backup coverage:**
  - [x] `ALL_BACKUP_KEYS` expanded to include: `arp_company_data`, `arp_platform_settings`, `arp_theme`, `arp_logo_header`, `arp_logo_login`.
  - [x] Backup checklist updated: "All 7 modules", added Company Data, Platform Settings, Logos rows.
  - [x] `OTHER_STORES` (Clear by Data Type) expanded with: Company Data (`arp_company_data`), Platform Settings (`arp_platform_settings`), Header Logo (`arp_logo_header`), Login Logo (`arp_logo_login`).

## Phase 5h: Centralized Data Store Registry (Completed — 19 May 2026)
- [x] **`src/lib/dataStoreRegistry.ts` — new central registry of every localStorage key the app owns:**
  - [x] `STORE_REGISTRY: StoreDefinition[]` — one entry per key with `{ key, label, description, icon, color, bg, border, system? }`.
  - [x] Exports: `STORE_BY_KEY` (lookup map), `ALL_REGISTERED_KEYS`, `USER_FACING_STORES`, `NON_REQUEST_STORES`, `OWNED_PREFIXES = ["arp_", "admin_", "feedback_"]`, `isOwnedKey()`, `discoverAllOwnedKeys()`.
  - [x] `discoverAllOwnedKeys()` returns registry keys ∪ runtime-discovered owned keys, so newly-added stores show up in backup even if a developer forgets to register them.
- [x] **Database admin page refactored** (`/admin/database`):
  - [x] No more hardcoded key lists. Imports `NON_REQUEST_STORES`, `ALL_REGISTERED_KEYS`, `STORE_BY_KEY`, `discoverAllOwnedKeys`, `isOwnedKey` from the registry.
  - [x] `collectBackup()` uses `discoverAllOwnedKeys()` — captures everything the app owns at runtime.
  - [x] `clearAllOwnedKeys()` clears registry keys ∪ any runtime-discovered owned key.
  - [x] Backup checklist UI is now generated from `NON_REQUEST_STORES` — adding a registry entry instantly appears in the user-facing list.
  - [x] Info banner updated: "Every store the app owns is captured automatically".
- [x] **Effect:** Adding any new localStorage key requires one edit to `dataStoreRegistry.ts`. Backup, restore, Clear-by-Data-Type, and Clear All all pick it up. No more silent gaps.

## Phase 5g: Company Data — Departments, Sectors & Searchable Dropdowns (Completed — 19 May 2026)
- [x] **Company Data store extended** (`src/lib/companyDataStore.ts`):
  - [x] Added `departments` and `sectors` keys to `CompanyDataKey` union and `DEFAULTS`.
  - [x] Defaults: Departments seeded with 8 standard departments (Engineering, IT, Finance, HR, Marketing, Sales, Operations, Administration). Sectors seeded with Technology, Operations, Corporate, Commercial.
  - [x] `getCompanyData()` parses both new keys with the same `Array.isArray` empty-array-safe pattern as the others.
- [x] **Admin → Company Data page** (`/admin/company-data`):
  - [x] Two new sections: **Departments** (Briefcase icon, indigo) and **Sectors** (Network icon, pink).
  - [x] Both inherit the existing search box + "Show all (N) / Show N more" collapse behavior, plus CSV/XLSX import + CSV export.
  - [x] Page widened to `max-w-5xl` to give long lists more room.
- [x] **Searchable dropdown component** (`src/components/ui/SearchableSelect.tsx` — new):
  - [x] Self-contained combobox (no extra deps): trigger button, search input, filtered list with "X of Y" footer, click-outside to close, optional clear button.
  - [x] Replaces every native `<Select>` that was sourced from companyDataStore — handles 1000+ items without UX collapse.
- [x] **Forms migrated to SearchableSelect:**
  - [x] **Shipping** — Supplier, Cost Center, Carrier, Direct Manager.
  - [x] **HR Onboarding** — Sector, Department, Direct Manager.
  - [x] **HR Offboarding** — Sector, Department, Direct Manager.
  - [x] **Purchase** — Department.
  - [x] **Event** — Department.
  - [x] **Travel** — Department.
  - [x] **Admin → Users** (Create + Edit dialogs) — Department.
  - [x] Free-text `<Input>` Department/Sector fields removed; all values must now come from Company Data.
- [x] **Database page copy updated** to mention Departments + Sectors under Company Data in the backup checklist and Clear-by-Data-Type list. `arp_company_data` already covered them — no schema changes needed.
- [x] **`.gitattributes` rewritten as UTF-8 LF** with rules for `.ts/.tsx/.sh/.yml/Dockerfile`. Prevents the CRLF bug that broke `docker-entrypoint.sh` on the Linux container.
- [x] **Pre-existing build errors in `src/app/(dashboard)/requests/page.tsx` fixed** — duplicate `STATUS_OPTIONS` block, duplicate `InlineStatusSelect` import, broken JSX paste inside unread-comment badge, duplicate `updateRequestStatus` function. Build was failing before this work; now clean.

## Phase 5i: Ubuntu Deployment + Cloudflare Tunnel + Google OAuth (Completed — 19 May 2026)
- [x] **Ubuntu server deployment** at `192.168.2.212` (user `docker-machine`):
  - [x] `Dockerfile` made cross-platform: detects whether `.next-dev/BUILD_ID` was shipped in the build context. If yes, uses the pre-built output (Windows path, avoids gRPC EOF errors from the containerd snapshotter). If no, runs `npm run build` inside the container (Ubuntu fresh clone path).
  - [x] Drops `--omit=dev` so `next build` has access to dev dependencies when it needs to run.
  - [x] `Dockerfile` healthcheck switched from `wget http://localhost:3003` (which fails once redirects target the public NEXTAUTH_URL) to `nc -z localhost 3003`. Same change applied in `docker-compose.yml`.
  - [x] `docker-entrypoint.sh` saved as LF (was CRLF, which broke `exec` on Linux). `.gitattributes` now pins `.sh text eol=lf`.
- [x] **AUTH_SECRET / NEXTAUTH_URL plumbed as Docker build args:**
  - [x] `next build` validates auth config at build time. Previously only available at runtime via `env_file:`, so the in-container Linux build failed with "Missing required auth secret".
  - [x] `Dockerfile` declares `ARG`/`ENV` pairs for `AUTH_SECRET`, `NEXTAUTH_SECRET`, `AUTH_URL`, `NEXTAUTH_URL`. `docker-compose.yml` passes them via `build.args` block, reading from `.env`.
- [x] **Cloudflare Tunnel** — public access at `https://adminhelpdesk.si-wareapps.com`:
  - [x] `docker-compose.yml` `tunnel` service runs `cloudflare/cloudflared:latest` with the tunnel token from `.env`.
  - [x] Command rewritten as a YAML list (`tunnel / run / --token / value`) — shell-style with the colon-rich JWT was being mangled.
  - [x] Public hostname in Cloudflare points to `app:3003` (docker network service name, not localhost).
- [x] **Server-side redirects build absolute URLs from `NEXTAUTH_URL` instead of `request.url`** to avoid leaking the internal docker host into `Location` headers:
  - [x] `src/app/landing/route.ts` — uses `process.env.NEXTAUTH_URL` as base.
  - [x] `src/middleware.ts` — `getPublicBase()` helper; `callbackUrl` query param uses `pathname + search`, never the full `nextUrl.href`.
- [x] **Google OAuth** wired up:
  - [x] OAuth client registered with redirect URI `https://adminhelpdesk.si-wareapps.com/api/auth/callback/google`. Localhost variants removed once production was confirmed working.
  - [x] `.env` (in the project root) is the file `docker compose` reads for variable substitution. The runtime container reads `.env.local` via `env_file:`. Both must contain the same values; `.env.local` is the source of truth for secrets.
- [x] **`.env` and `docker-compose.yml NEXTAUTH_URL/AUTH_URL`** are now templated as `${NEXTAUTH_URL:-http://localhost:3003}` so the same compose works for local-dev and prod deploys.

## Phase 5j: Feedback Server-Side Store + Survey Reminder + Misc Fixes (Completed — 19 May 2026)
- [x] **Feedback moved from localStorage to a server-side JSON store** (`src/lib/feedbackStore.ts` → `data/feedback.json` on disk). Previously surveys were created with browser-local IDs, so email recipients opening the link on a different device hit "Survey not found".
  - [x] New API routes: `POST /api/feedback/send-survey` (creates server-side survey first, then emails the link), `GET /api/feedback/survey/[id]` (public lookup), `POST /api/feedback/survey/[id]/submit` (public submit), `POST /api/feedback/inline` (auth-gated in-page Submit Feedback button), `GET /api/feedback/responses` (auth-gated list), `DELETE /api/feedback/responses` (auth-gated clear).
  - [x] One-survey-per-request enforcement: `send-survey` short-circuits if a survey already exists for the requestId. `inline` route completes a pending email survey instead of creating a duplicate.
  - [x] `feedback-survey/page.tsx` and `feedback-reports/page.tsx` fetch from the API. `requests/[id]/page.tsx` Submit Feedback button POSTs to `/api/feedback/inline`.
  - [x] Feedback Survey public page now shows the Si-Ware logo above the card (matches the email branding).
- [x] **Survey reminder banner on My Requests** — amber card listing the user's completed/delivered requests that haven't been rated. Up to 5 chip links to each request; dismissible per-session.
- [x] **My Requests inline status dropdown now uses per-module status lists** — previously rendered the generic 6-status list for every row (HR rows showed In Customs / Cancelled, which don't exist). Mirrors All Requests' `MODULE_STATUSES` / `MODULE_STATUS_LABELS` map.
- [x] **HR module: Cancel request action removed from the three-dot menu** — HR has no Cancelled state. Hidden on the HR page and on All Requests when the row is HR, regardless of `cancel_request` permission.
- [x] **Clear All Feedback button removed from `/feedback-reports`** — non-admins shouldn't have a destructive action there. Database admin page is now the only place to clear feedback.
- [x] **IMAP inbound sync filter widened** — the sync was vacuuming up the app's own outbound notification emails (status updates, new-comment alerts) when they bounced back via Gmail filters or account aliasing, storing each as a phantom "user comment" on the matching request. `src/lib/emailReplySync.ts` now inspects the body for distinctive markers (`NEW COMMENT ADDED`, `updated a request in the Admin Helpdesk Portal`, `Open request [https...]`) and skips any message matching them, regardless of subject or sender. Existing phantom comments were purged by a one-off cleanup script.
- [x] **Audit Trail task events** show the real actor — was reading `task.createdBy` / `activity.user`, which don't exist. Fixed to read `assignedBy` / `activity.changedBy`, with backward-compatible fallbacks for older records.

## Phase 5k: Dashboard, Sidebar Badges, Dark Mode, Branding (Completed — 19 May 2026)
- [x] **Dashboard professional redesign** (`src/app/(dashboard)/dashboard/page.tsx`):
  - [x] Default time range is now Last 30 Days (was 7d), with vs-prior-period comparison built into every Hero KPI.
  - [x] Hero KPIs: Active Requests, Overdue (7d+), Avg Resolution, Satisfaction. Each card colors its delta badge by direction-of-good (lower-is-better metrics flip the green/red logic). "no prior data" shown when the previous window had zero requests.
  - [x] Secondary KPI strip: Total / Completed / Cancelled / Completion Rate.
  - [x] Charts have real empty states ("No requests in this period yet").
  - [x] **Module Workload table** — Total / Active / Overdue / Completed / Avg Days per module, with module names clickable to the module page.
  - [x] **Oldest Open Requests** panel — top 5 longest-waiting active requests across the entire dataset.
  - [x] **Recent Feedback** panel — pulls from `/api/feedback/responses` (server-side).
  - [x] Custom date range inputs inline with the preset pills.
  - [x] Subtle animations: `useCountUp` hook for KPI numbers (700ms ease-out cubic), staggered fade-in + slide-up for each card section (60ms apart), small 0.5px lift + shadow on hover. No bounce, no pulse.
- [x] **Sidebar per-page new-request badges** — for Administration Team / Full Access users only:
  - [x] `useNewRequestsAndTasks` hook now returns `newRequestsByModule` (per-module counts of requests with status `new`).
  - [x] Sidebar maps each nav href to a module key and renders a small red count chip (or 99+ overflow) next to the title. Top-level "Administration Team" parent aggregates its children's counts. Collapsed sidebar shows a small red dot on the icon when items are pending.
  - [x] Counts refresh on `storage` event (cross-tab), `focus`, and a 30s interval — plus a new custom `arp:storage` event dispatched by `engineService.writeAll()` and `taskService.saveTasks()` so same-tab status changes update badges instantly without a page reload.
  - [x] Sidebar title spans use `whitespace-nowrap truncate` so titles don't wrap to a second line when the badge appears.
- [x] **Dark mode coordinated palette overhaul** (`src/app/globals.css`):
  - [x] CSS variables (`--background`, `--card`, `--popover`, etc.) repointed to a slate-blue scale (page bg `hsl(222 24% 9%)` → card `hsl(222 22% 15%)` → hover `hsl(222 22% 19%)`).
  - [x] Hardcoded `bg-white` / `bg-gray-50` / `bg-gray-100` / `bg-gray-200` mapped to the same scale.
  - [x] Tailwind opacity-modified variants (`bg-gray-50/40`, `bg-blue-50/30`, `hover:bg-blue-50/30`, etc.) get explicit overrides — they were being missed previously because they're separate class names from `bg-gray-50`.
  - [x] Every `bg-<color>-50` / `bg-<color>-100` / `border-<color>-200` / `text-<color>-{600..900}` used in the app gets a same-hue dark counterpart with proper saturation/lightness. Status pills, stat cards, feedback chips all look intentional in dark mode now.
  - [x] Slate-800 table headers pushed slightly darker so they don't visually clash with the page background.
- [x] **CC fields refreshed** — replaced the inline email input with a searchable user-directory picker + free-typed email input, both rendered side-by-side. Backed by a new `GET /api/users/directory` endpoint (any signed-in user can read; returns `id/name/email/image/role` for active users only). Applied to per-form `CcEmailsField` (HR, Purchase, Event, Travel, General, Shipping) and the on-detail-page `CcPanel`.
- [x] **CC Notifications card moved to the bottom of every form** (right above Cancel/Submit), matching the HR onboarding layout. Shipping and General Request previously had it before Attachments — swapped. Team Tasks "Create New Task" form also got a CC Notifications field.
- [x] **Company Data: Departments + Sectors lookup tables added** to `companyDataStore`. Page widened to `max-w-5xl`. Defaults emptied for production; `ProductionDataWipe` marker bumped to `arp_prod_wipe_v2` to auto-wipe seeded values from existing browsers on next visit.
- [x] **`page:dashboard` permission restricted to Administration Team / Full Access** — already correctly gated in roles.json, middleware, and Sidebar filter (via `canAccessPath`). Other roles cannot see the Dashboard nav item or navigate to `/dashboard`.
- [x] **Favicon replaced** — `public/favicon.svg` (blue headset) deleted in favor of `public/Icon.png` (the new magnifier glyph). `layout.tsx` metadata updated.
- [x] **My Requests filter by actual session user** — was hardcoded to `USR-001`. Now matches by `requesterId`, `requesterEmail`, or `requesterName` against the session.
- [x] **Pre-existing TDZ crash on Sidebar fixed** — `isAdminAudience` was reading `role` before its `const` declaration ran, producing "Cannot access 'A' before initialization" once the page hydrated. Reordered the declarations.

## Phase 5l: Full Backup Coverage Including Server-Side Data (Completed — 19 May 2026)
- [x] **Backups now capture server-side files** (`data/comments.json`, `data/feedback.json`, `data/users.json`, `data/roles.json`) in addition to browser localStorage.
  - [x] New `GET/POST/DELETE /api/admin/server-data` endpoint, auth-gated by `page:admin-database` or `manage_users`. GET returns all `user_data` files. POST writes them back (used by Restore). DELETE wipes the `clearable: true` files (comments + feedback); users + roles are intentionally preserved so admins can't lock themselves out via the Clear All button.
  - [x] `BackupManifest` version bumped to `1.1`, adds a `serverData: Record<string, unknown>` field. Old v1.0 backups (browser-only) are still accepted by Restore.
  - [x] `collectBackup()` and `restoreBackup()` are now async — they `await` the server-data round-trip. `handleBackup()` and the file-upload `onload` handler updated to await accordingly.
  - [x] Clear All now hits both `clearAllOwnedKeys()` (browser) and `DELETE /api/admin/server-data` (server) and reports both counts in the success message.
  - [x] Backup checklist UI lists the new server-side rows so the admin sees what's covered.
  - [x] Info banner copy updated: "browser data + server-side data, downloaded as one JSON file (version 1.1)".

## Phase 5m: Multi-User Foundations (Completed — 20 May 2026)
- [x] **Server-side request store** (`src/lib/requestStore.ts` → `data/requests.json`):
  - [x] `GET /api/requests` — any signed-in user reads every request. `POST` — upserts one. `DELETE` — removes one or wipes all.
  - [x] Client `engineService` keeps the existing **sync** API (`getRequests()`, `submitRequest()`, etc.) so 100+ call sites don't need refactoring. Reads stay local; writes mirror to the server via `pushToServer()`.
  - [x] `useEngineSync` hook (mounted in the dashboard Shell) pulls server state on mount, on focus, on visibility change, and every 30s — overwriting the local cache so other users' submissions appear without a page reload.
  - [x] **One-shot migration** on first visit pushes any pre-existing local-only requests up to the server so historical data isn't lost.
  - [x] Auto-assignment cascade: when `POST /api/requests` sees a brand-new request with no explicit assignee, it stamps on the configured default assignee server-side, returns the populated record, and the client mirrors it back into localStorage.
  - [x] Comment cascade-cleanup: every `submitRequest` calls `DELETE /api/requests/comments?requestId=…` so a recycled ID can't inherit ghost comments from a deleted predecessor.
- [x] **Server-side Company Data store** (`src/lib/companyDataServerStore.ts` → `data/company-data.json`):
  - [x] `GET /api/company-data` — any signed-in user reads (so every form's dropdowns populate for every user). `PUT` — requires `page:admin-company-data`, `settings`, `manage_users`, or Full Access.
  - [x] Client `companyDataStore` wraps localStorage but also pushes every write up to the server and pulls on the same 30s cadence as requests.
  - [x] One-shot backfill pushes existing localStorage values up to the server the first time.
- [x] **Sub-pages for Shipping** with direction discriminator. `shipping.schema.ts` adds `direction: "sending" | "receiving"`. ShippingForm takes a `direction` prop, Receiving and Sending list pages each filter by their bucket. Direction badge (blue / purple) shown on every shipping row in All Requests + My Requests so users can tell them apart at a glance.

## Phase 5n: Assignee Feature (Completed — 20 May 2026)
- [x] **EngineRequest** gains `assignedToId / assignedToName / assignedToEmail` (nullable).
- [x] **`assignRequest()` mutator** in `engineService.ts` — writes locally + pushes to server + fires the in-app + email assignment notification.
- [x] **`assign_requests` permission** added to `access.ts` type union and `data/roles.json` (granted to Administration Team + Full Access). Surfaces as "Assign Requests" in the Admin → Roles dialog.
- [x] **`<AssigneeSelect>` component** — searchable dropdown sourced from `/api/users/admin-team` (now includes `image` for avatar rendering). Compact pill mode for table cells, full select for the detail-page card.
- [x] **Request detail page** has an "Assigned To" card in Details with the picker, gated by `assign_requests`.
- [x] **All Requests page** has an "Assigned To" column with the same inline picker.
- [x] **Default Assignee**: `StoredUser.defaultAssignee?: boolean`. Only one user holds it. New API `GET/POST /api/users/default-assignee` (read open, write admin-only). Admin → Users Edit dialog shows a blue panel with a checkbox when the chosen role is Administration Team. Auto-assignment runs server-side in `POST /api/requests` for brand-new requests that have no explicit assignee.
- [x] **Assignment notifications** — `createAssignmentNotifications` in notificationStore fires in-app + email to the assignee. Self-assignment skips the email; default-assignment is silent (the assignee is already on the new-request To: line, so a second email would just trigger Gmail throttling).

## Phase 5o: Email Delivery Reliability (Completed — 20 May 2026)
- [x] **SMTP connection pooling**: `nodemailer.createTransport({ pool: true, maxConnections: 1, rateLimit: 1, rateDelta: 2000 })`. One persistent connection serves every request, queued by nodemailer. Eliminates the Gmail `421 Try again later (EHLO)` throttling that happened when each notification opened its own SMTP connection.
- [x] **Singleton transporter** keyed by config — only torn down and rebuilt when Admin → Notifications changes the saved settings.
- [x] **Smarter retry backoff**: 3 attempts; on `421` throttle responses, waits 6s then 18s instead of 2s/4s.
- [x] **`/api/users/admin-team`** now returns only **Administration Team** members (Full Access excluded by design — it's a super-admin role, not a working queue).
- [x] **`createNewRequestNotifications`** recipient model finalized:
  - **To:** every Administration Team member + the requester + adminhelpdesk@si-ware.com.
  - **Cc:** form-provided CC emails + the selected Direct Manager (resolved via Company Data managers list).
  - De-duped case-insensitively; anyone on the To: line is dropped from Cc.
- [x] **Managers store upgrade**: `companyDataStore` now persists managers as `Array<string | { name, email }>`. Admin → Company Data → Managers section takes both name and email fields. `getManagerEmail(name)` resolves the email for auto-CC. Every Shipping + Purchase + HR form auto-CCs the selected Direct Manager.
- [x] **Direct Manager added to Purchase form** (required), matching the Shipping pattern.
- [x] **Module list page bug fix**: shipping list pages were looking up the requester via `mockUsers.find(by name)` which fails for Google-auth users — now reads `requesterEmail` directly from the stored request so the requester always gets the email.

## Phase 5p: Attachments — Multi-User Viewing (Completed — 20 May 2026)
- [x] **`src/lib/attachments.ts`** — shared `filesToAttachments()` helper converts uploaded files to base64 `data:` URLs at submit time. Used by Shipping, Purchase, HR (both), Maintenance, Event, Travel, General. Replaces `URL.createObjectURL()` (`blob:` URLs only exist in the original uploader's browser tab).
- [x] **Schemas updated** for every module to accept the attachment object shape `{ id, name, url, mimeType, sizeBytes, uploadedAt }` instead of `z.array(z.string())`.
- [x] **Attachment-proxy route** `GET /api/requests/:id/attachments/:idOrIndex`:
  - Decodes the base64 `data:` URL server-side and serves the bytes back with the correct `Content-Type` and `Content-Disposition: inline`.
  - Why: Chrome blocks top-level navigation to `data:` URLs as a phishing protection — proxying lets us preview images / PDFs in a new tab with a normal HTTPS URL.
  - Index parameter accepts either a numeric position OR the attachment's `id` field, so it disambiguates request-level attachments from comment-level attachments.
- [x] **Detail page Attachments tab**:
  - Click the row → **opens preview in a new tab** via the proxy URL.
  - "Download" button → uses the original data URL so the browser saves the file with its real name.
  - Legacy `blob:` URLs show an amber notice asking the user to re-upload.

## Phase 5q: UX Polish (Completed — 20 May 2026)
- [x] **Status label normalization**: every status code maps to a canonical label via `src/lib/statusPalette.ts`. "In Progress" is always blue, "Completed" always emerald, etc. — regardless of which module's underlying code (`on_hold`, `in_progress`, `in_transit`) feeds it. Dashboard chart and Travel stat card relabeled from "On Hold" → "In Progress" to match.
- [x] **Direction badge** (Receiving / Sending) on shipping rows in All Requests + My Requests.
- [x] **Mobile-first responsiveness**: globals.css collapses fixed multi-col grids to 1-col below 768px (catches every stat-card row across pages without per-page edits). `.form-footer` class on every module form stacks Cancel/Submit full-width on mobile. Dialogs clamp to viewport with `max-width: calc(100vw - 1.5rem)`. Shell adds a hamburger drawer below `lg` and slimmer padding (`p-3 sm:p-4 md:p-6`).
- [x] **Hamburger on desktop**: TopBar hamburger toggles the sidebar between expanded (256px) and collapsed (64px) via a custom `arp:toggle-sidebar` event. Below `lg` the same button opens the mobile drawer.
- [x] **Collapsed sidebar parent click**: clicking a parent icon expands the sidebar, opens the section's submenu, and soft-navigates (`router.push`) to the first child page. No reload, no flyout race condition.
- [x] **Login page dark mode**: card / background / text / divider all have dark-mode variants. Matches the rest of the app.
- [x] **General Request form footer** sits on the right (`justify-end`) matching the rest of the forms.
- [x] **Comment cascade-cleanup**: ghost comments from a recycled request ID are evicted on each new submit (see Phase 5m).
- [x] **Per-page request scoping**: a Requester (with only `read_own`) now sees only their own submissions on Shipping (both directions), HR, Maintenance, Purchase, Event, Travel, General. Implemented via `scopeRequests()` in `access.ts`. Administration Team and Full Access still see everything.
- [x] **Database admin page checklist**: shows Server Requests, Server Company Data, Server Comments, Server Feedback, plus Users & Roles (preserved on Clear All).
- [x] **`/api/admin/server-data`** now backs up + restores `data/requests.json` and `data/company-data.json` alongside comments / feedback / users / roles.

## Phase 5r: Purchase Approval Workflow (Completed — 20 May 2026)
- [x] **`awaiting_approval` status** added to RequestStatus. Replaces `in_customs` for Purchase semantics. List page, stat card, status pill, and detail-page dropdown all use the new code. Color stays amber.
- [x] **Status code normalisation**: every module's STATUS_LABELS / STATUSES / MODULE_STATUSES maps now use codes that match the UI label 1:1 — `in_progress` not `on_hold`, `in_transit` not collision-mapped, `awaiting_approval` for Purchase, `in_customs` only for Shipping. Legacy `on_hold` is kept in palette maps so historical data still renders as "In Progress" (blue).
- [x] **Approval email** (`src/lib/emailService.ts` → `sendPurchaseApprovalEmail`):
  - Fired automatically when a Purchase request moves to `awaiting_approval`.
  - To: the selected Direct Manager. Cc: Administration Team + requester + helpdesk + form CC + admin CC.
  - Renders every field needed to decide (item, description, category, platform, supplier, product URL, quantity, estimated price, business justification, requester info).
  - Includes one-click Approve / Reject buttons.
- [x] **Signed approval tokens** (`src/lib/approvalToken.ts`):
  - HMAC-SHA256 over `{rid, act, mgr, exp}` using `AUTH_SECRET`.
  - Token is bound to the request id AND the manager's email — the route verifies both before applying any state change.
  - 14-day expiry.
- [x] **API**:
  - `POST /api/requests/:id/send-approval-email` — server-side trigger; resolves manager email from `data/company-data.json`, signs the tokens, sends the email.
  - `GET /api/requests/:id/approve?token=…` — verifies signature + matches current Direct Manager via `resolveRequestManagerEmail` (`src/lib/approvalNotify.ts`). On success: flips status to `in_progress`, adds a system comment "Approved" authored as "Direct Manager", fans out a decision email to admin team + requester + helpdesk + manager + payload CCs.
  - `GET /api/requests/:id/reject?token=…` — same, but → `cancelled` and comment "Rejected".
  - Returns styled HTML pages (not JSON) since the user lands here from an email client.
- [x] **Direct Manager auto-CC on every email** for the request: `getAllCcEmails()` now resolves both Shipping `approvers.directManager.email` and Purchase/HR `payload.directManager` (via Company Data manager lookup) and includes them in the CC list automatically. Manager stays in the loop on status changes, comments, etc.

## Phase 5s: Data Hygiene + System Controls (Completed — 21 May 2026)
- [x] **Per-page Clear All wipes the server too**:
  - Admin → Database "Clear All Data" now requires the user to type `CLEAR` in a confirm box.
  - Hits `DELETE /api/admin/server-data` which wipes every `clearable: true` file: `requests.json`, `comments.json`, `feedback.json`, `company-data.json`. `users.json` / `roles.json` are intentionally `clearable: false` so admins can't lock themselves out.
  - Wipes all owned localStorage keys for the clicking user and broadcasts an `arp_global_clear_broadcast` storage event so every other open tab follows.
- [x] **Per-module Clear** now wipes the server: `DELETE /api/requests?module=<id>` so clearing e.g. Shipping actually removes shipping rows from `data/requests.json` and the next sync doesn't re-populate.
- [x] **Per-store Clear** hits the right server endpoint when applicable (`arp_requests` → DELETE /api/requests; `arp_company_data` → PUT empty shape; `feedback_*` → DELETE /api/feedback/responses).
- [x] **Permanent delete per row** (`RequestActionsMenu.showDeleteOption`):
  - Red "Delete permanently" item visible only to Full Access / `manage_users` / wildcard.
  - Wired into All Requests + every module list (Receiving, Sending, HR, Maintenance, Purchase, Event, Travel, General).
  - Calls `deleteRequestPermanently(id)` → wipes locally + server + comment cascade.
- [x] **Maintenance Mode**:
  - `data/maintenance.json` stores `{ maintenance, maintenanceMessage, sessionMinVersion }`.
  - `GET/PUT /api/admin/maintenance` — toggle + edit message (admin-only).
  - Auth jwt callback stamps `maintenance` flag onto every token; middleware reads it and redirects non-admins to `/system-maintenance` (a centred "We'll be right back" page).
  - Full Access / wildcard users keep access so they can flip the flag back off.
  - Admin → Database → "System Controls" section exposes the toggle + editable message.
- [x] **Force sign-out all users**:
  - `POST /api/admin/maintenance` bumps `sessionMinVersion` to the current epoch.
  - Auth jwt callback stamps an explicit `issuedAtSec` on each fresh sign-in. When `sessionMinVersion > issuedAtSec`, the token is marked `stale: true`.
  - Middleware sees `stale` and redirects to `/api/auth/signout?callbackUrl=/login` — NextAuth properly clears the cookie, no infinite loop on `/login`.
  - Brand-new sign-ins always succeed because their `issuedAtSec` is current.
  - Admin → Database → "System Controls" → "Sign out everyone" with single-click confirm-then-do.
- [x] **Unauthorized page** rewritten: fixed full-viewport positioning, dark-mode aware card, icon, and a "Sign in with another account" button that links to `/api/auth/signout?callbackUrl=/login` so users can switch accounts without manually clearing cookies.

## Phase 5t: Team Requests Page (Completed — 02 Jun 2026)
- [x] **Team Requests page** at `/team-requests` — shows all requests where the logged-in user is the selected Direct Manager, regardless of who submitted the request or which module it belongs to.
  - [x] Covers both storage formats: Shipping (`payload.approvers.directManager.{name,email}`) and HR/Purchase/others (`payload.directManager` name string, resolved to email via Company Data).
  - [x] Feature parity with My Requests: stat cards, module + status filter pills, search, sortable/resizable dark slate table, unread comment badges, inline status editing.
  - [x] Requester Name column added so the manager can see whose request it is.
  - [x] `page:team-requests` added to `pageRegistry.ts`, `access.ts` (`permissionForPath`), and all roles except Requester in `data/roles.json`.
  - [x] Sidebar entry (UsersRound icon) added after My Requests.

## Phase 5u: Feedback Survey Admin Controls (Completed — 02 Jun 2026)
- [x] **Admin → Settings → "Feedback Survey" card** — new section at the bottom of the settings page:
  - [x] **Enable/Disable toggle** — when off, `POST /api/feedback/send-survey` skips silently (`surveys_disabled` reason). Re-enable anytime.
  - [x] **Email Subject** field — editable, supports `{{requesterName}}`, `{{requestTitle}}`, `{{requestId}}`, `{{module}}` template variables.
  - [x] **Email Body / greeting paragraph** textarea — replaces the default "Hi … your request has been completed" text in the survey email. Same variables apply.
  - [x] **Reset to default text** link — restores both fields in one click.
  - [x] Settings persisted to `data/platform-settings.json` server-side via `GET/POST /api/admin/settings` so they survive container restarts.
  - [x] Settings page loads server values on mount (merges over localStorage so the toggle always reflects the real server state).
  - [x] `src/lib/settingsServer.ts` — server-side read/write for `data/platform-settings.json`.

## Phase 5v: Scheduled Automatic Backups (Completed — 02 Jun 2026)
- [x] **Scheduled Backups card** in Admin → Database — full UI to configure and trigger backups:
  - [x] Enable/Disable toggle.
  - [x] Frequency: Hourly / Daily / Weekly / Monthly.
  - [x] Time (24h), Day of Week (weekly), Day of Month (monthly).
  - [x] Retention: keep last N files (0 = keep all); oldest files pruned automatically.
  - [x] **Save Schedule** button — persists to `data/backup-schedule.json`.
  - [x] **Run Backup Now** button — triggers an immediate server-side backup.
  - [x] Live file list showing all backups in `~/admin-helpdesk-Backup` with filename, size, and timestamp.
- [x] **Backup files saved to `~/admin-helpdesk-Backup`** on the Ubuntu host via Docker bind mount (`~/admin-helpdesk-Backup:/app/backups` in `docker-compose.yml`).
- [x] **Background scheduler** — `src/instrumentation.ts` starts `backupCron.ts` on server boot. Checks every 5 minutes; runs `runBackup()` when schedule is due.
- [x] Each backup is a full `v1.1` JSON snapshot of all `data/*.json` server files (requests, comments, feedback, users, roles, company-data, platform-settings, email-config, backup-schedule).
- [x] New API routes: `GET/POST /api/admin/backup-schedule`, `POST /api/admin/backup-now`.
- [x] `next.config.ts`: `experimental.instrumentationHook: true` to enable the instrumentation file.
- [x] Database page info banner updated: clarifies Team Requests is a filtered view (no separate data — covered by All Requests backup).

## Phase 5w: Event Module — Live Form (Completed — 11 Jun 2026)
- [x] **Event Request module fully live** (was "Coming Soon"):
  - [x] Removed Coming Soon button/banner from event list page and form footer.
  - [x] `event.schema.ts` rewritten: removed `eventName`, `eventType`, `location`; added `eventLocationType: "internal" | "external"`, `floorNumber`, `roomArea`, `addressOrUrl`. `superRefine` enforces location fields based on type.
  - [x] `EventForm.tsx` rewritten: Internal/External mutually-exclusive styled checkbox toggle. Internal → Floor Number (from `FLOOR_NUMBERS` in maintenance schema) + free-text Room/Area input. External → Address / Location URL text input.
  - [x] Removed Organizer Name and Budget (EGP) fields.
  - [x] `event/new/page.tsx` replaced Coming Soon placeholder with real `<EventForm>`.

## Phase 5x: Bug Fixes & Performance (Completed — 11 Jun 2026)
- [x] **Form submission error fixed (all 6 module forms):**
  - [x] `router.push()` / `router.refresh()` moved outside try/catch in ShippingForm, HRForm, PurchaseForm, MaintenanceForm, TravelForm, EventForm.
  - [x] Root cause: Next.js 15 `router.push()` throws a navigation signal internally that was being caught and shown as "Failed to create request".
- [x] **QuotaExceededError fixed** (`engineService.ts` `writeAll()`):
  - [x] On `QuotaExceededError`, strips base64 attachment data from local cache and retries. Attachments are already on the server via `pushToServer()`.
  - [x] If still full after stripping, clears cache entirely — `syncFromServer()` restores on next load.
- [x] **Navigation performance** (`useEngineSync`):
  - [x] Polling interval increased from 30s → 60s.
  - [x] Module-level dedup guard: only one pull in-flight at a time.
  - [x] 20s minimum gap between pulls — rapid tab-switching no longer stacks concurrent fetches.
  - [x] `syncFromServer` + `syncCompanyDataFromServer` run in parallel (`Promise.all`) instead of sequentially.
- [x] **SearchableSelect — full UX overhaul** (`src/components/ui/SearchableSelect.tsx`):
  - [x] Deduplicates options case-insensitively (fixes duplicate entries like "Administration × 2").
  - [x] Highlights matching text in results (bold orange mark via `<Highlight>` component).
  - [x] Smart ranking: starts-with matches ranked above contains matches.
  - [x] Full keyboard navigation: `↑`/`↓` to move, `Enter` to select, `Escape` to close; active item auto-scrolls.
  - [x] Chevron rotates on open; trigger shows ring focus state.
  - [x] Clear query button (X) inside search input.
  - [x] Better empty state: icon + "No results for '…'" message.
  - [x] Footer shows result count with query context + currently selected value.

## Phase 5y: Timestamps & Audit Trail (Completed — 11 Jun 2026)
- [x] **Shared date utilities** (`src/lib/utils.ts`):
  - [x] `fmtDate(iso)` → `"10 Jun 2026"` — used for Submission Date / createdAt columns.
  - [x] `fmtDateTime(iso)` → `"10 Jun 2026 — 11:05 AM"` — used for Last Update Date / updatedAt columns.
  - [x] All 17 pages/components migrated from inline `toLocaleDateString()` to `fmtDate`/`fmtDateTime`.
- [x] **Audit Trail enhancements** (`/admin/audit-trail`):
  - [x] Actor IDs resolved to real names: `buildUserMap()` now fetches `/api/users` first, covering Google OAuth long numeric IDs. Falls back to localStorage requests + tasks.
  - [x] `buildAuditLog()` fetches requests from `/api/requests` (server-side) so all users' activity appears, not just the current browser's local cache.
  - [x] **Deletions tracked**: `deleteRequestPermanently()` logs a `request_deleted` audit event via `src/lib/auditLog.ts`.
  - [x] **Edits tracked**: `updateRequest()` logs a `request_edited` audit event.
  - [x] `src/lib/auditLog.ts` — new localStorage audit event store (`arp_audit_log`), keeps last 500 events, never throws.
  - [x] Timestamps use `fmtDateTime()` format.

## Phase 5z: Permissions, Purchase Total & Registry (Completed — 11 Jun 2026)
- [x] **Missing `page:event-new` and `page:travel-new` permissions added:**
  - [x] `pageRegistry.ts` — two new entries auto-wire middleware + Admin → Roles dialog UI.
  - [x] `access.ts` — added to Permission union + `permissionForPath()`.
  - [x] `roles.json` — granted to Full Access and Administration Team.
- [x] **Purchase form — live Total Estimated Price:**
  - [x] Watches `quantity × estimatedPrice` in real time; green box within budget, red + warning when > 3,000 EGP.
  - [x] "Estimated Price" label renamed → "Unit Price"; hard 3,000 EGP cap removed from unit field.
  - [x] Purchase list page "Estimated Price" column → "Total Price" (qty × unit price); sort + expanded row updated.
- [x] **Data Store Registry updated** (`src/lib/dataStoreRegistry.ts`):
  - [x] `arp_audit_log` registered — backup/restore/clear now includes audit events.
  - [x] `arp_requests_server_migration_v1` and `arp_company_data_server_migration_v1` registered as system markers so Clear All wipes them.

## Phase 6a: Recycle Bin, Session Tracking & Audit Completeness (Completed — 11 Jun 2026)
- [x] **Deleted Requests recycle bin** (`Admin → Database → Deleted Requests`):
  - [x] `src/lib/deletedRequestStore.ts` — server-side `data/deleted-requests.json`, keeps last 200 full snapshots with `deletedAt` + `deletedBy`.
  - [x] `DELETE /api/requests` single-id path saves full snapshot before removing.
  - [x] `engineService.deleteRequestPermanently()` also fires `POST /api/requests/deleted` immediately for belt-and-suspenders coverage.
  - [x] `POST /api/requests/restore` — restores a deleted request back into `requestStore`, removes from bin.
  - [x] `DELETE /api/requests/deleted` — purge one or all from bin.
  - [x] Database page card: table with Request ID, Title, Module badge, Status at deletion, Deleted At, Deleted By. Per-row Restore (green) + Purge (red). "Purge All" with type-CLEAR confirm.
- [x] **Online session indicator** (`Admin → Users`):
  - [x] `src/lib/sessionStore.ts` — server-side `data/sessions.json`, tracks `lastSeen` per user; prunes records > 7 days.
  - [x] `POST /api/session/heartbeat` — any signed-in user pings every 60s; `GET` returns online list (admin-only).
  - [x] `src/hooks/useHeartbeat.ts` — pings every 60s while authenticated; mounted in Shell.
  - [x] Users page: new "Online Now" stat card (pulsing green dot) + "Offline" stat card replacing "Admins". Session column: pulsing green "Online" or gray "Offline" badge per row.
- [x] **Server-side Audit Log** (`src/lib/serverAuditLog.ts` → `data/audit-log.json`):
  - [x] `GET /api/admin/audit-log` — admin-gated endpoint; Audit Trail page fetches and merges entries.
  - [x] **User events logged**: `user_created` (name, email, role), `user_updated` (field-level diff), `user_role_changed` (before → after), `user_deleted`, `user_password_reset` (admin vs self-change).
  - [x] **Role events logged**: `role_created`, `role_updated` (permission diff: +N added / −N removed), `role_deleted`.
  - [x] **Company Data events logged**: `company_data_updated` — per-section diff showing Added/Removed items for Suppliers, Cost Centers, Managers, Carriers, Departments, Sectors.
  - [x] Audit Trail page User + Role filter tabs now show real data from these server-side events.
- [x] **Attachment upload zones** — removed misleading "drag and drop" hint (drag events were never wired); all 7 forms now show "Click to browse files".
- [x] **CC Notifications field** — clear two-column layout: "Portal Users" (left, existing accounts) + "External Recipients" (right, free-type email). Empty state hints to use external field. Footer note updated.
- [x] **Users page "Joined" column** — now shows full timestamp (`fmtDateTime`) instead of date only.

## Phase 6: Advanced Functionality (Pending)
- [ ] **Email Notifications:** SMTP ports 465/587 may be blocked by corporate firewall. Use Admin → Notifications to configure Gmail App Password or switch to SendGrid/Brevo (HTTP API, not blocked).
- [ ] **Audit Trail Enhancement:** Server-side audit log now covers user/role/company-data changes. Future: extend to cover all request status changes server-side for cross-browser completeness.
- [ ] **Database Backup:** Currently localStorage + data/*.json. Future: server-side PostgreSQL dump endpoint.

## Phase 6b: Audit Trail & UX Improvements (Completed — 11 Jun 2026)
- [x] **Audit Trail — Assignments category**: removed Task/Auth filter pills; added sky-blue "Assignments" category. `assignRequest()` logs `request_assigned` event showing "Assigned to [name]" or "Assignment cleared". Task created/status events folded into Request/Status categories.
- [x] **Audit Trail — Company Data category**: indigo `Building2` icon filter pill; `company_data_updated` events now have their own category separate from User.
- [x] **Audit Trail — Company Data tracking**: `PUT /api/company-data` diffs each list before/after and logs one entry per changed section (Added/Removed items).
- [x] **Audit Trail — User & Role tracking** (`src/lib/serverAuditLog.ts`): all user creation, update, role-change, deletion, password-reset, and role CRUD events logged server-side to `data/audit-log.json`.
- [x] **Users page**: "Joined" column now shows full `fmtDateTime` timestamp. "Admins" stat card replaced with "Offline" count.
- [x] **SearchableSelect**: full UX rewrite — deduplication, highlighted matches, keyboard navigation, smart ranking, clear button, better empty state.
- [x] **Purchase form**: live Total Estimated Price (qty × unit price), green/red budget indicator.
- [x] **Event form**: Internal/External location toggle live; Floor Number from maintenance schema; free-text Room/Area.

## Phase 6c: Performance Optimisations (Completed — 11 Jun 2026)
- [x] **Sidebar** (`src/components/layout/Sidebar.tsx`):
  - [x] `visibleNavItems` wrapped in `useMemo` — only recomputes when permissions/role change.
  - [x] `badgeCountForHref`, `isActive`, `canSee`, `moduleForHref` all wrapped in `useCallback`.
  - [x] `allRequestsTotal` memoized — badge sum computed once per state change, not per call.
  - [x] Result: eliminates 100+ redundant function calls per sidebar render.
- [x] **`useNewRequestsAndTasks`** (`src/hooks/useNewRequestsAndTasks.ts`):
  - [x] Module-level raw-string cache — skips `JSON.parse` entirely when localStorage content unchanged.
  - [x] Interval increased 30s → 60s.
  - [x] `focus` + cross-tab `storage` events debounced 500ms; same-tab `arp:storage` still fires immediately.
- [x] **`engineService.readAll()`** (`src/services/engineService.ts`):
  - [x] In-memory cache keyed on raw string — repeated calls within a write cycle return cached array without re-parsing JSON.
  - [x] `writeAll()` invalidates cache on every write.
- [x] **`useViewedComments`** (`src/hooks/useViewedComments.ts`):
  - [x] `localStorage.setItem` debounced to 1s — previously fired on every comment view, triggering `arp:storage` cascade each time.

## Phase 6d: Audit Trail — Database & Maintenance Tracking (Completed — 11 Jun 2026)
- [x] **Audit Trail — Database category**: rose-red `Database` icon filter pill; all Database admin page actions now tracked under a dedicated "Database" category.
- [x] **Database page actions tracked** (`src/app/(dashboard)/admin/database/page.tsx`):
  - [x] **Backup downloaded** — manual "Download Backup" button; logs filename + store counts.
  - [x] **Scheduled backup (Run Now)** — logs filename + size.
  - [x] **Restore from file** — logs backup date + number of stores restored/skipped.
  - [x] **Clear All Data** — logs browser store count + server file count wiped.
  - [x] **Clear by Module** — logs module name + request count removed.
  - [x] **Clear by Store** (localStorage) — logs store label.
  - [x] **Clear Server File** — logs server file label.
  - [x] **Maintenance mode toggled ON/OFF** — logs new state + message.
  - [x] **Maintenance message updated** — logs first 80 chars of new message.
  - [x] **Force sign out all users** — logs session invalidation event.
- [x] **Audit Trail actor resolution** (`/admin/audit-trail`): actor column now resolves Google OAuth numeric IDs to display names via `/api/users`; falls back to local cache.
- [x] **Audit Trail user email in targetId**: all user API audit events (`user_created`, `user_updated`, `user_role_changed`, `user_deleted`, `user_password_reset`) now use `user.email` as `targetId` instead of raw internal IDs (e.g. `USR-1779286151583`).
- [x] **`src/lib/auditLog.ts`** extended: new action types `database_backup`, `database_restore`, `database_clear`, `maintenance_toggled`, `maintenance_message_updated`, `force_signout_all`.
- [x] **`useSession`** added to DatabasePage component — actor name/email stamped on every log entry.

## Phase 6e: Backup Improvements (Completed — 14 Jun 2026)
- [x] **Scheduled & Run Now backups now capture full browser data (~11 MB parity with Download Backup):**
  - [x] New `POST /api/admin/browser-data` route — accepts browser localStorage snapshot, writes to `data/browser-data.json`.
  - [x] `collectBackup()` pushes browser data to server before downloading — keeps server in sync on every manual backup.
  - [x] `runBackupNow()` pushes browser data to server first, then triggers `/api/admin/backup-now` — server backup includes tasks, notifications, audit log, logos, theme, viewed comments.
  - [x] `backupRunner.ts` includes `browser-data.json` in `SERVER_FILES` list.
  - [x] Backup checklist UI shows new "Browser Data Snapshot" row.
  - [x] Info banner updated to explain the sync behaviour.
- [x] **Multi-frequency scheduled backups** — previously only one frequency active at a time:
  - [x] `BackupSchedule.frequencies: BackupFrequency[]` replaces single `frequency` field; old saved schedules auto-migrated on first read.
  - [x] `shouldRunNow()` fires if ANY active frequency is due.
  - [x] UI frequency buttons are now multi-select toggles (e.g. Hourly + Daily simultaneously).
  - [x] Time / Day of Week / Day of Month fields shown when any non-hourly frequency is active.
- [x] **Backup filename format** — human-readable 12-hour format with seconds:
  - [x] Old: `backup-2026-06-14-07-04-24.json`
  - [x] New: `Backup-14-06-2026 - 07.04.24 AM.json`
  - [x] `makeBackupFilename(date)` helper exported from `backupRunner.ts` — used by both server-side scheduler and browser download handler.

## Phase 6f: Data Loss Protection & Fresh-Browser Sync (Completed — 14 Jun 2026)
- [x] **`restart: always`** in `docker-compose.yml` (was `unless-stopped`) — containers now auto-start after a power cut or VM reboot.
- [x] **Bind-mount `data/` to host filesystem** — `~/admin-helpdesk-data:/app/data` replaces opaque Docker named volume `app_data`. Data survives container recreation and is directly visible/copyable on the host.
- [x] **Removed unused `app_data` named volume** from `docker-compose.yml`.
- [x] **`TZ: Africa/Cairo`** added to app service environment — server `new Date()` always returns Cairo time; fixes backup filename timezone mismatch (was 3 hours behind).
- [x] **`useEngineSync` always pulls on mount** — `lastPullAt` reset to 0 on every mount so a fresh browser (cleared cookies/localStorage) immediately syncs all requests from the server without waiting for the 60s interval.

## Phase 6g: Markdown Description Fields (Completed — 14 Jun 2026)
- [x] **`MarkdownEditor` component** (`src/components/ui/MarkdownEditor.tsx`):
  - [x] Toolbar: Bold, Italic, Heading, Bullet list, Numbered list, Link, Divider buttons.
  - [x] **Preview toggle** — click "Preview" to see rendered markdown before submitting; click "Edit" to go back.
  - [x] Uses `react-hook-form` `Controller` so Zod validation still applies.
  - [x] Applied to description fields in: **Maintenance**, **Purchase**, **Event**, **Shipping**, **General** forms.
- [x] **`MarkdownDisplay` component** (`src/components/ui/MarkdownDisplay.tsx`):
  - [x] Renders markdown via `react-markdown` + `@tailwindcss/typography` prose classes.
  - [x] Dark-mode aware (prose color overrides for dark palette).
  - [x] Applied to: **Request detail page** (`requests/[id]`) description section; **inline row expansions** on General, Maintenance, Purchase list pages.
- [x] **Dependencies added**: `react-markdown`, `@tailwindcss/typography` — typography plugin registered in `tailwind.config.ts`.
- [x] **Backward compatible** — existing plain-text descriptions render unchanged (plain text is valid markdown).

## Phase 6h: Multi-Device Sync & Missing Requests Fix (Completed — 14 Jun 2026)
- [x] **All pages re-render when server sync completes** — fixes mobile/fresh-browser showing 0 requests:
  - [x] Root cause: pages called `setRequests(getRequests())` once on mount with no listener for `arp:storage` event that `useEngineSync` dispatches after pulling from the server.
  - [x] Fix: added `storage` + `arp:storage` event listeners to all 10 affected pages: All Requests, My Requests, HR, Maintenance, Purchase, General, Shipping Receiving, Dashboard, Event, Travel.
  - [x] HR, Maintenance, Purchase, General, Shipping Receiving: load logic converted to `useCallback` so the same function is reused as the storage listener.
- [x] **`useEngineSync` re-syncs immediately after login** — fixes cookie-clear showing 0 requests:
  - [x] Root cause: sync hook depended only on `[intervalMs]`, never re-fired when session changed from unauthenticated → authenticated.
  - [x] Fix: `useSession()` added to `useEngineSync`; effect now depends on `status`. Skips while unauthenticated; re-runs + resets `lastPullAt = 0` the moment session becomes `authenticated`.
- [x] **Missing requests fix — `pushToServer` reliability**:
  - [x] Root cause: `pushToServer()` was fire-and-forget (`void async`). Silent failures left requests only in the submitter's localStorage; other users never saw them via server sync.
  - [x] Fix: 3 retries with exponential backoff (2s, 4s). Failed requests tracked in `_pendingPush` Map.
  - [x] Pending pushes persisted to `arp_pending_push` in localStorage — survive page reloads.
  - [x] `retryPendingPushes()` called by `useEngineSync` on every mount — failed pushes from previous sessions are retried automatically.
  - [x] `syncFromServer()` changed from wholesale overwrite to merge — preserves local-only pending records so a slow network doesn't cause a user to lose their own just-submitted request during sync.
  - [x] `arp_pending_push` registered in `dataStoreRegistry.ts` (system: true).

## Phase 6i: Critical Bug Fixes — Sync, Crashes & URL Linking (Completed — 14 Jun 2026)
- [x] **All pages fetch directly from server on mount** (no localStorage dependency):
  - [x] All Requests, My Requests, HR, Maintenance, Purchase, General: `setRequests(json.data)` directly from `fetch("/api/requests")` response — bypasses `getRequests()` and in-memory cache entirely.
  - [x] Dashboard: same direct fetch in `sync()` function.
  - [x] Shipping Receiving: same direct fetch, transforms and sets shipments state directly.
  - [x] Request detail page (`requests/[id]`): fetches from server if localStorage is empty — fixes "Request not found" on fresh browser.
- [x] **HR onboarding/offboarding crash fixed** (`useCallback is not defined`):
  - [x] `useCallback` was used in `loadRequests` but missing from React import in `hr/page.tsx`.
  - [x] `react-markdown` ESM crash fixed: added all ESM-only deps to `transpilePackages` in `next.config.ts`.
  - [x] Replaced `remark-gfm` (ESM-only, caused persistent crash) with a regex-based URL auto-linker in `MarkdownDisplay.tsx` — no extra package needed.
- [x] **Assignment reverts to "Unassigned" after sync — fixed**:
  - [x] Root cause: `syncFromServer()` treated server as absolute authority for existing records. If the 60s sync fired before `pushToServer()` completed, it pulled the server's stale version (no assignee) and overwrote the local optimistic update.
  - [x] Fix: during merge, any record in `_pendingPush` keeps its **local** version (guaranteed newer). Once push completes, record removed from pending and future syncs use server version normally.
- [x] **Bare URLs auto-linked in description fields** (all pages):
  - [x] `MarkdownDisplay.tsx`: `autoLinkUrls()` regex pre-processor converts bare `https://...` URLs to markdown links before rendering.
  - [x] All links open in new tab (`target="_blank"`, `rel="noopener noreferrer"`) with `break-all` for long URLs.
  - [x] Applies everywhere `MarkdownDisplay` is used: request detail page, inline row expansions.

## Phase 6j: Assignment & Status Persistence Fix (Completed — 14 Jun 2026)
- [x] **`assignRequest()` and `updateStatus()` made async** — both now `await pushToServer()` so the server is guaranteed to have the latest data before the function returns. All 11 call sites updated with `void` prefix.
- [x] **`_pendingPush` loaded on module init** — `loadPending()` called immediately when `engineService` module loads (client-side) so `syncFromServer()` merge logic has the pending map populated from the first render.
- [x] **`syncFromServer()` merge prefers local pending version** — for any record in `_pendingPush` (including updates like assignments), the local version wins over the server version during merge, since local is guaranteed newer. Only removed from pending after push succeeds.
- [x] **Pages re-render from the merged engine cache** — `arp:storage` listeners read `getRequests()` after `syncFromServer()` finishes, rather than bypassing pending-write protection with direct server fetches.
- [x] **`writeAll()` suppresses `arp:storage` while pushes are in flight** — prevents listeners from rendering stale server data before `pushToServer()` completes.

## Phase 6k: Request Identity, Sync Ordering & Database Counts (Completed — 15 Jun 2026)
- [x] **Server-authoritative request IDs for every module** — new Shipping, Maintenance, Purchase, Event, Travel, HR, and General requests use atomic server-side sequential IDs. Concurrent submissions can no longer overwrite another user's request.
- [x] **Idempotent request creation** — each create has a stable `clientRequestId`, so network retries return the original request instead of creating duplicates.
- [x] **Collision protection for legacy upserts** — an existing request ID with a different creation timestamp returns `409` rather than replacing the stored request.
- [x] **Pending writes registered before local events** — status, assignee, edit, comment-activity, CC, and draft mutations enter `_pendingPush` before `writeAll()`, closing the navigation/refresh race.
- [x] **Out-of-order update protection** — stale client responses cannot clear newer pending records, and the server ignores writes whose `updatedAt` is older than the stored version.
- [x] **Cache invalidation fixed after sync** — `syncFromServer()` now writes through `writeAll()`, ensuring the in-memory read cache and page listeners see the merged result.
- [x] **Shipping pages use persisted engine data** — overview, Sending, and Receiving re-render from the shared request cache instead of mock or raw stale server data.
- [x] **Database Clear-by-Module counts are server-backed** — module cards now show the authoritative current counts, with automatic refresh after clear, restore, focus, sync, and cross-tab changes.

## Phase 6l: Module Request JSON Import (Completed — 15 Jun 2026)
- [x] **Import Requests card added to Admin → Database** — administrators select Shipping, Maintenance, Purchase, Event, Travel, HR, or General before choosing a JSON file.
- [x] **Single and multiple request import** — accepts a direct request object, request array, `{ request }`, `{ requests }`, `{ data }`, or a backup wrapper containing `data.arp_requests`.
- [x] **Selected-module enforcement** — every imported record must already belong to the selected module; mixed or mismatched module files are rejected.
- [x] **Required-field and date validation** — server validates IDs, title, status, requester identity, payload, status history, and timestamps before persistence.
- [x] **Strict no-overwrite protection** — live request IDs, repeated IDs within the uploaded file, and IDs retained in the recycle bin are rejected.
- [x] **Atomic multi-record persistence** — all records are validated before `requestStore.importMany()` writes to `data/requests.json`; one invalid or duplicate record rejects the entire import with no partial save.
- [x] **Post-import synchronization** — the browser refreshes the authoritative request list, updates `arp_requests`, dispatches `arp:storage`, and refreshes Database module counts.
- [x] **Audit Trail integration** — successful imports appear under the Database category with module, filename, and imported record count.
- [x] **Import authorization** — restricted to Full Access, wildcard, `manage_users`, or `page:admin-database` permissions.
- [x] **Import size limit** — one operation accepts up to 1,000 request records.

## Phase 6m: Attachment Visibility Across All Request Pages (Completed — 15 Jun 2026)
- [x] **Root cause fixed in the shared request-detail page** — localStorage may intentionally strip base64 attachment data after `QuotaExceededError`, so cached requests cannot be authoritative for the Attachments tab.
- [x] **Server-first request detail loading** — `/requests/[id]` now fetches the complete request from the server before rendering; localStorage is used only as an offline/pending-request fallback.
- [x] **Direct request lookup added** — authenticated `GET /api/requests?id=<requestId>` returns one full server-persisted request without downloading the entire request list.
- [x] **All module forms covered** — Shipping, Maintenance, Purchase, Event, Travel, HR onboarding/offboarding, and General already persist uploaded files in `payload.attachments` as base64 data URLs.
- [x] **Existing server attachments restored in the UI** — records whose browser cache omitted attachments now display them after the detail page refreshes from the server.
- [x] **Attachment preview response typing fixed** — decoded file buffers are returned as `Uint8Array`, compatible with the current `NextResponse` body definitions.

## Phase 6n: Purchase Approval Email Reliability (Completed — 15 Jun 2026)
- [x] **Automatic Awaiting Approval trigger made reliable** — `updateStatus()` now awaits the Purchase approval-email API when a request first enters `awaiting_approval`.
- [x] **Email failures are visible** — missing manager email, SMTP failures, and API errors are returned to Request Details, Purchase, and All Requests instead of being silently discarded.
- [x] **Resend Approval Email action added** — Purchase requests already in Awaiting Approval show a resend button with sending, success, and error states.
- [x] **Manager email stored on Purchase requests** — new and edited requests persist `directManagerEmail` alongside the selected manager name.
- [x] **Recipient resolution strengthened** — approval email lookup checks the stored request email, Company Data manager records, active users by name/email, and legacy email-as-name values.
- [x] **Approval links use a valid portal origin** — falls back to the incoming request origin when `NEXTAUTH_URL` and `AUTH_URL` are not configured.
- [x] **Existing stuck requests recoverable** — admins can reopen a request in Awaiting Approval and resend without changing its status again.

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
| `src/app/(dashboard)/team-requests/page.tsx` | Team Requests — Direct Manager view | Filters all requests where session user = Direct Manager; covers Shipping approvers and HR/Purchase name-string format |
| `src/app/(dashboard)/admin/all-requests/page.tsx` | All Requests admin view | All team requests, search, filters, team tasks integration |

### Module Pages
| File | Purpose | Key Features |
|------|---------|--------------|
| `src/app/(dashboard)/shipping/page.tsx` | Shipping module | Status: new/in_progress/in_customs/delivered/cancelled |
| `src/app/(dashboard)/shipping/receiving/page.tsx` | Shipping Receiving submodule | Receiving-specific workflow |
| `src/app/(dashboard)/general/page.tsx` | General Request module | Statuses: new/in_progress/completed/cancelled; indigo color theme |
| `src/app/(dashboard)/general/new/page.tsx` | General Request form | Title + Description + Attachments (base64); centered max-w-3xl |
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
| `src/app/(dashboard)/admin/audit-trail/page.tsx` | Audit Trail | Reads localStorage, resolves USR-* IDs to names, category filter + search |
| `src/app/(dashboard)/admin/database/page.tsx` | Database Backup/Restore, Request Import + Scheduled Backups | Module-aware single/multiple request JSON import with no-overwrite validation; imports central registry; auto-discovers all owned keys; Scheduled Backups card with frequency/time/retention controls + Run Now + file list |
| `src/lib/dataStoreRegistry.ts` | Central localStorage registry | Single source of truth for every owned key. Adding a `StoreDefinition` here makes it appear in Database backup/restore/clear automatically |
| `src/lib/backupScheduleStore.ts` | Backup schedule config store | Reads/writes `data/backup-schedule.json`; `listBackupFiles()` and `pruneOldBackups()` |
| `src/lib/backupRunner.ts` | Backup execution logic | `runBackup()` — collects all data/*.json and writes timestamped JSON to `/app/backups/`; `shouldRunNow()` schedule evaluator |
| `src/lib/backupCron.ts` | Background backup scheduler | Started by `instrumentation.ts` on boot; `setInterval` every 5 min; calls `runBackup()` when due |
| `src/instrumentation.ts` | Next.js server startup hook | Starts `backupCron` in Node.js runtime only |
| `src/lib/settingsServer.ts` | Platform settings server store | Reads/writes `data/platform-settings.json`; used by feedback survey send route and admin settings API |
| `src/app/(dashboard)/admin/company-data/page.tsx` | Company Data lookups | Manages Suppliers, Cost Centers, Managers, Carriers, Departments, Sectors — searchable + collapsible lists, CSV/XLSX import + export |
| `src/components/ui/SearchableSelect.tsx` | Searchable dropdown | Self-contained combobox: filter input, click-outside close, used by all form dropdowns sourced from companyDataStore |
| `src/lib/companyDataStore.ts` | Company Data store | localStorage key `arp_company_data`; `getList()`, `saveList()`; Array.isArray empty-array safe |
| `src/app/(dashboard)/notifications/page.tsx` | Notification log | All/Unread filter, mark-all-read, click to navigate to request |
| `src/app/(dashboard)/notifications/settings/page.tsx` | Notification preferences | Per-user email/in-app toggle settings |
| `src/app/api/users/assignable/route.ts` | Assignable users API | Returns users whose role has `page:tasks` permission |
| `src/components/layout/ProductionDataWipe.tsx` | Production data wipe | Clears stale localStorage on first boot (key: `arp_prod_wipe_v1`) |

### Components & Utilities
| File | Purpose | Key Features |
|------|---------|--------------|
| `src/components/layout/Sidebar.tsx` | Navigation sidebar | Module nav, active state highlighting, collapsible groups |
| `src/components/layout/ThemeProvider.tsx` | Dark mode provider | next-themes wrapper; `attribute="class"`, `storageKey="arp_theme"` |
| `src/components/ui/InlineStatusSelect.tsx` | Inline status dropdown | Module-aware status list, optimistic update, chevron indicator |
| `src/components/ui/RequestActionsMenu.tsx` | Three-dot row action menu | View Details (expand), Edit (form link) |
| `src/hooks/useExpandedRows.ts` | Row expansion state hook | `toggleRow()`, `isExpanded()` per request ID |
| `src/modules/hr/HRForm.tsx` | HR create form | Toggle-based type selection, checkbox items, Direct Manager Select from companyDataStore |
| `src/modules/shipping/ShippingForm.tsx` | Shipping form | All dropdowns (Supplier, Cost Center, Carrier, Manager) read from companyDataStore |

---
### Development Loop (Repeat for each module)
1. **Sync Plan:** Update this `CLAUDE.md`.
2. **Define Schema:** Create/Update `Zod` schemas.
3. **Execute:** Write NestJS code & DB migrations.
4. **Verify:** Test against Audit Logs and JSONB validation.
