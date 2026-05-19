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
| `src/app/(dashboard)/admin/database/page.tsx` | Database Backup/Restore | Imports central registry; auto-discovers all owned keys at runtime; backup checklist + Clear-by-Data-Type generated from registry |
| `src/lib/dataStoreRegistry.ts` | Central localStorage registry | Single source of truth for every owned key. Adding a `StoreDefinition` here makes it appear in Database backup/restore/clear automatically |
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
