# Admin Helpdesk Portal

Enterprise helpdesk request management platform built with Next.js 15, TypeScript, Tailwind CSS, and shadcn/ui. Deployed via Docker on Ubuntu with Cloudflare Tunnel for public access.

**Live URL:** https://adminhelpdesk.si-wareapps.com

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v3 + shadcn/ui |
| Icons | lucide-react |
| Charts | Recharts |
| Auth | NextAuth v5 (credentials + Google OAuth) |
| Database | PostgreSQL 16 (Prisma ORM) |
| Storage | Server-side JSON files (`/app/data/`) |
| Deployment | Docker Compose on Ubuntu |
| Public access | Cloudflare Tunnel |

---

## Quick Start (Development)

```bash
npm install --legacy-peer-deps
cp .env.example .env.local   # fill in AUTH_SECRET, NEXTAUTH_URL, SMTP_*, etc.
npm run dev
```

Open [http://localhost:3003](http://localhost:3003).

---

## Request Data Reliability

- New requests receive server-issued sequential IDs per module and year.
- Concurrent submissions and retried network requests cannot overwrite or duplicate requests.
- Pending status, assignee, and request edits are preserved during navigation and background synchronization.
- Request pages re-render from the merged engine cache after server sync.
- Admin Database module counts come from the authoritative server request store and refresh after clear or restore operations.

---

## Docker Deployment (Ubuntu)

```bash
git clone https://github.com/marwanelafifi-dev/Admin-Helpdesk-Portal.git
cd Admin-Helpdesk-Portal
cp .env.example .env.local    # configure secrets
mkdir -p ~/admin-helpdesk-Backup
docker compose up --build -d
```

### With Cloudflare Tunnel

```bash
# Set CLOUDFLARE_TUNNEL_TOKEN in .env.local first
docker compose --profile tunnel up --build -d
```

### Containers

| Container | Purpose | Port |
|-----------|---------|------|
| `admin-helpdesk-app` | Next.js application | 3003 |
| `admin-helpdesk-db` | PostgreSQL 16 | 5432 |
| `admin-helpdesk-tunnel` | Cloudflare Tunnel | — |

### Volumes

| Volume / Mount | Purpose |
|----------------|---------|
| `app_data` → `/app/data` | Server-side JSON stores (requests, comments, feedback, users, roles, settings) |
| `~/admin-helpdesk-Backup` → `/app/backups` | Automated scheduled backup files |
| `postgres_data` | PostgreSQL data persistence |

---

## Environment Variables

```env
AUTH_SECRET=<random 32-char secret>
NEXTAUTH_SECRET=<same as AUTH_SECRET>
NEXTAUTH_URL=https://adminhelpdesk.si-wareapps.com
AUTH_URL=https://adminhelpdesk.si-wareapps.com
AUTH_GOOGLE_ID=<Google OAuth client ID>
AUTH_GOOGLE_SECRET=<Google OAuth client secret>
DB_USER=admin
DB_PASSWORD=<password>
DB_NAME=admin_request_platform
CLOUDFLARE_TUNNEL_TOKEN=<token>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<gmail>
SMTP_PASSWORD=<app password>
SMTP_FROM=<display email>
```

---

## Pages & Modules

### Request Modules

| Route | Module | Description |
|-------|--------|-------------|
| `/shipping/receiving` | Shipping | Incoming shipments |
| `/shipping/sending` | Shipping | Outgoing shipments |
| `/hr/onboarding` | HR | Employee onboarding |
| `/hr/offboarding` | HR | Employee offboarding |
| `/maintenance` | Maintenance | Facility & IT tickets |
| `/purchase` | Purchase | Purchase orders with approval workflow |
| `/event` | Event | Event planning requests |
| `/travel` | Travel | Travel booking requests |
| `/general` | General | General helpdesk requests |

### Core Pages

| Route | Description |
|-------|-------------|
| `/dashboard` | KPI cards, charts, module workload table, recent feedback |
| `/requests` | My Requests — all submissions by the logged-in user |
| `/team-requests` | Team Requests — requests where the logged-in user is Direct Manager |
| `/admin/all-requests` | All Requests admin view — full team requests + search + filters |
| `/tasks` | Team Tasks — Administration Team task management |
| `/feedback-reports` | Employee feedback analytics and module ratings |
| `/feedback-survey` | Public survey form (no auth required) |

### Admin Pages

| Route | Description |
|-------|-------------|
| `/admin/users` | User management (create, edit, reset password, assign roles) |
| `/admin/roles` | Role management with granular page + permission checkboxes |
| `/admin/settings` | Platform branding, login page, security, feedback survey config |
| `/admin/notifications` | SMTP email configuration |
| `/admin/company-data` | Lookup tables: Suppliers, Cost Centers, Managers, Carriers, Departments, Sectors |
| `/admin/audit-trail` | System event log with category filter |
| `/admin/database` | Backup/restore, clear data, scheduled automatic backups, maintenance mode |

---

## Key Architecture

### Data Storage

All request data is stored in server-side JSON files (no PostgreSQL for requests in v1 — Prisma is wired for future migration):

```
/app/data/
├── requests.json        # All request records
├── comments.json        # Per-request comment threads
├── feedback.json        # Survey records + responses
├── users.json           # User accounts
├── roles.json           # Role definitions + permissions
├── company-data.json    # Lookup tables (suppliers, managers, etc.)
├── platform-settings.json  # Branding, feedback survey config
├── backup-schedule.json    # Automated backup schedule
└── email-config.json    # SMTP configuration
```

### Scheduled Backups

- Configurable from Admin → Database → "Scheduled Backups" card
- Frequencies: hourly / daily / weekly / monthly
- Files saved to `~/admin-helpdesk-Backup` on the host
- Retention policy: auto-prune oldest files
- Background check every 5 minutes via `src/instrumentation.ts`

### Permission System

Four built-in roles:

| Role | Access |
|------|--------|
| Full Access | Everything (super-admin) |
| Administration Team | All modules + dashboard + team tasks |
| People Team | Selected modules only |
| Requester | Own requests only, selected modules |

Permissions are fully customizable per-role from Admin → Roles.

### Email Notifications

Automatic emails on:
- New request submitted (To: admin team + requester + helpdesk; Cc: direct manager + form CC recipients)
- Status update
- New comment added
- Task assigned
- Purchase approval request (one-click Approve / Reject links in email)
- Feedback survey (configurable — can be disabled from Admin → Settings)

---

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── requests/              # My Requests
│   │   ├── team-requests/         # Team Requests (Direct Manager view)
│   │   ├── shipping/
│   │   │   ├── receiving/
│   │   │   └── sending/
│   │   ├── hr/
│   │   │   ├── onboarding/
│   │   │   └── offboarding/
│   │   ├── maintenance/
│   │   ├── purchase/
│   │   ├── event/
│   │   ├── travel/
│   │   ├── general/
│   │   ├── tasks/
│   │   ├── feedback-reports/
│   │   ├── notifications/
│   │   └── admin/
│   │       ├── all-requests/
│   │       ├── users/
│   │       ├── roles/
│   │       ├── settings/
│   │       ├── notifications/
│   │       ├── company-data/
│   │       ├── audit-trail/
│   │       └── database/
│   ├── api/
│   │   ├── admin/
│   │   │   ├── backup-now/        # POST — trigger immediate backup
│   │   │   ├── backup-schedule/   # GET/POST — manage schedule
│   │   │   ├── maintenance/       # GET/PUT/POST — maintenance mode
│   │   │   ├── server-data/       # GET/POST/DELETE — server file bundle
│   │   │   └── settings/          # GET/POST — platform settings
│   │   ├── feedback/
│   │   ├── requests/
│   │   └── users/
│   ├── feedback-survey/           # Public survey (no auth)
│   └── login/
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── TopBar.tsx
│   └── ui/
│       ├── InlineStatusSelect.tsx
│       ├── RequestActionsMenu.tsx
│       ├── AssigneeSelect.tsx
│       └── SearchableSelect.tsx
├── lib/
│   ├── access.ts                  # Route permissions + scopeRequests()
│   ├── backupCron.ts              # Background scheduler
│   ├── backupRunner.ts            # Backup execution logic
│   ├── backupScheduleStore.ts     # Schedule config store
│   ├── companyDataStore.ts        # Company Data localStorage + server sync
│   ├── dataStoreRegistry.ts       # Central localStorage key registry
│   ├── emailService.ts            # All outbound email templates
│   ├── feedbackStore.ts           # Feedback server-side store
│   ├── pageRegistry.ts            # Page permission definitions (middleware + Roles UI)
│   ├── requestStore.ts            # Server-side request store
│   └── settingsServer.ts          # Platform settings server-side store
├── modules/
│   ├── shipping/ShippingForm.tsx
│   ├── hr/HRForm.tsx
│   ├── maintenance/MaintenanceForm.tsx
│   ├── purchase/PurchaseForm.tsx
│   ├── event/EventForm.tsx
│   └── travel/TravelForm.tsx
├── services/
│   ├── engineService.ts           # Client-side request store + sync
│   └── taskService.ts             # Team tasks store
└── instrumentation.ts             # Next.js server startup hook (starts backup cron)
```

---

## Adding a New Page

1. Create `src/app/(dashboard)/<page>/page.tsx`
2. Add entry to `src/lib/pageRegistry.ts` (auto-wires middleware + Roles checkbox)
3. Add permission `page:<id>` to relevant roles in `data/roles.json`
4. Add nav item to `src/components/layout/Sidebar.tsx`

## Adding a New Module

Follow the same 4 steps above, plus:
5. Add module id to `RequestModule` union in `engineService.ts`
6. Add `MODULE_PREFIX` entry in `engineService.ts`
7. Add to All Requests and My Requests filter pills
8. Add to Database page `REQUEST_MODULES` array

## Importing Requests

Administrators can import request JSON from **Admin > Database > Import Requests**:

1. Select the destination module/page.
2. Click **Import Request JSON**.
3. Upload a JSON file containing one request object or multiple request objects.

Accepted JSON shapes include:

- A single request object.
- An array of request objects.
- `{ "request": { ... } }`
- `{ "requests": [ ... ] }`
- `{ "data": [ ... ] }`
- A backup wrapper containing `data.arp_requests`.

Every request must contain the selected module id and the required request fields. Imports are atomic and never overwrite existing data. If any request ID already exists in live requests, appears more than once in the file, or remains in the recycle bin, the entire import is rejected and no records are saved.

## Request Attachments

All request forms persist uploaded files in `payload.attachments` as base64 data URLs so they can be viewed by other users and on other devices. This applies to Shipping, Maintenance, Purchase, Event, Travel, HR onboarding/offboarding, and General requests.

The request detail page loads the complete request from the server before rendering the **Attachments** tab. Browser localStorage is only a fallback because its quota-protection path may remove large attachment data from the local cache. Existing attachments remain stored on the server and reappear when the request detail page refreshes.
