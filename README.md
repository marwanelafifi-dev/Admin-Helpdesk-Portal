# Admin Request Platform

Enterprise admin request management platform built with Next.js 15, TypeScript, Tailwind CSS, and shadcn/ui.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v3
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Icons**: lucide-react
- **Charts**: Recharts
- **Font**: Inter (Google Fonts)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

> If you see peer dependency warnings (recharts ↔ React 19), use:
> ```bash
> npm install --legacy-peer-deps
> ```

### 2. Run the development server

```bash
npm run dev
```

Open [http://localhost:3003](http://localhost:3003) in your browser.

The app redirects from `/` → `/dashboard` automatically. To see the login page, navigate to `/login`.

### 3. Build for production

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/          # Route group — all pages share DashboardLayout
│   │   ├── layout.tsx        # Sidebar + TopBar shell
│   │   ├── dashboard/        # /dashboard
│   │   ├── requests/         # /requests
│   │   ├── shipping/         # /shipping
│   │   ├── maintenance/      # /maintenance
│   │   ├── purchase/         # /purchase
│   │   ├── event/            # /event
│   │   ├── travel/           # /travel
│   │   └── admin/
│   │       ├── users/        # /admin/users
│   │       ├── roles/        # /admin/roles
│   │       └── settings/     # /admin/settings
│   ├── login/                # /login  (no sidebar)
│   ├── globals.css
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Redirects → /dashboard
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx       # Collapsible sidebar with expandable Admin section
│   │   └── TopBar.tsx        # Notification bell, user avatar, logout
│   └── ui/                   # shadcn/ui components
│       ├── avatar.tsx
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── dropdown-menu.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── select.tsx
│       ├── separator.tsx
│       └── table.tsx
└── lib/
    ├── utils.ts              # cn() helper
    └── mock-data.ts          # All mock data + TypeScript types
```

## Pages Overview

| Route | Description |
|-------|-------------|
| `/login` | Two-step login: credentials → TOTP (Google Authenticator) |
| `/dashboard` | Stat cards, requests-by-module bar chart, recent activity feed |
| `/requests` | Filterable table (search, status filter, module filter) |
| `/shipping` | Shipment stat cards, full shipment table with carrier/status filters, Add button |
| `/maintenance` | Shell with stat cards (coming soon) |
| `/purchase` | Shell with stat cards (coming soon) |
| `/event` | Shell with stat cards (coming soon) |
| `/travel` | Shell with stat cards (coming soon) |
| `/admin/users` | User list table with avatar, role badge, status indicator |
| `/admin/roles` | Role cards with permission tags |
| `/admin/settings` | Settings form shell |

## UI Design Decisions

- **Primary color**: Blue (`#3b82f6` / `hsl(221.2 83.2% 53.3%)`)
- **Sidebar**: Dark slate (`bg-slate-900`), collapsible via toggle at the bottom, Admin section has expand/collapse
- **Theme**: Light only
- **Collapsed sidebar**: Icons only with `title` tooltip; expand with toggle button
- **All mock data** lives in `src/lib/mock-data.ts` — replace with API calls when backend is ready

## Next Steps (Backend Integration)

1. Replace mock data in `src/lib/mock-data.ts` with API client calls
2. Add authentication logic to `Sidebar` and route protection (Next.js middleware)
3. Wire up the login form to your auth provider
4. Implement TOTP verification against your 2FA backend
5. Add real notifications via WebSocket or polling

## Built-in API (Local Dev Backend)

This repo now includes a simple file-backed API (Next.js Route Handlers) for local development.

- Health check: `GET /api/health`
- Requests CRUD:
  - `GET /api/requests/:module`
  - `POST /api/requests/:module` (body: `{ payload, meta }`)
  - `GET /api/requests/:module/:id`
  - `PATCH /api/requests/:module/:id`
  - `DELETE /api/requests/:module/:id`
- Seed demo data (dev only): `POST /api/dev/seed` (use `?force=1` to overwrite)
