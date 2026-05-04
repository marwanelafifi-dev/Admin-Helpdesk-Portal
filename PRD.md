# PRD: Admin Request Platform

## Product Overview

The Admin Request Platform is an enterprise-grade request management system designed to streamline administrative workflows across six operational modules: Shipping, HR, Maintenance, Purchase, Event, and Travel.

## Vision & Goals

**Primary Goal:** Centralize all administrative requests into a single, intuitive platform with module-specific workflows while maintaining consistent UI/UX patterns.

**Success Metrics:**
- Reduce average request resolution time by 30%
- Achieve 95%+ request completion rate within target SLA
- Support 100+ concurrent users
- Provide real-time visibility into all pending requests

---

## Core Modules Summary

| Module | Purpose | Status | Key Columns |
|--------|---------|--------|-------------|
| Shipping | Track shipments | ✓ UI + Forms Complete | ID, Pickup Date, Tracking #, PO #, Cost Center, Carrier, Requester, Status, Delivery Date, Last Update |
| HR | Onboarding/Offboarding | ✓ UI + Forms Complete | ID, Employee ID, Employee Name, Department, Sector, Type, Status, Last Update |
| Maintenance | Facility maintenance | ✓ UI + Form Complete | ID, Title, Submission Date, Requester, Priority, Status, Last Update |
| Purchase | Procurement orders | ✓ UI + Form Complete | ID, Title, Submission Date, Requester, Supplier, Estimated Price, Status, Last Update |
| Event | Corporate events | UI Complete, Form Coming Soon | ID, Title, Submission Date, Requester, Event Date, Attendees, Status, Last Update |
| Travel | Business travel | UI Complete, Form Coming Soon | ID, Title, Submission Date, Requester, Destination, Travel Date, Status, Last Update |

---

## Standardized Table Column Structure

All module pages follow this consistent ordering:
1. **Request ID** - Unique identifier
2. **Request Title** - User-entered description (except Shipping: Pickup Date as 2nd column)
3. **Submission Date** - createdAt timestamp, formatted DD-MMM-YYYY
4. **Requester Name** - Name of submitter (omitted in My Requests view)
5. **Module-Specific Columns** - Supplier, Priority, Event Date, Destination, etc.
6. **Status** - Color-coded badge with dot indicator (only column with color styling)
7. **Last Update Date** - updatedAt timestamp, formatted DD-MMM-YYYY

**Styling Rules:**
- All data cells: `text-sm font-medium text-gray-700` (formal, consistent appearance)
- Status column: `InlineStatusSelect` badge — clickable dropdown of module-specific allowed statuses
- Header: Dark slate (`bg-slate-800` on `<thead>`) extending full row width with no gaps
- Rows: Zebra striping (white/light gray alternating); light blue `bg-blue-50` highlight when unread comments exist
- Columns auto-size to content by default; user can drag column edges to resize manually
- Three-dot action menu on each row: View Details (inline expand) + Edit (form link)

---

## Status Models

### Unified Status (Maintenance, Event, Travel, HR)
- **New** (Sky blue) - Submitted, awaiting action
- **In Progress** (Amber) - Actively being processed
- **Completed** (Emerald) - Fully resolved
- **Cancelled** (Red) - Cancelled

### Shipping-Specific Status
- **New** → **In Progress** → **In Customs** → **Delivered** → **Completed** / **Cancelled**

### Purchase-Specific Status
- **New** → **Awaiting Approval** → **In Progress** → **Delivered** → **Cancelled**

---

## Key Features

### My Requests
- User-scoped view of all submitted requests across modules
- Stat cards: Total, Draft, New, In Progress, Delivered, Completed, Cancelled
- Table columns: ID, Title, Submission Date, Module, Status, Last Update Date
- Filters: Status + Module quick-filter pills

### All Requests (Admin)
- View all requests from all users
- Stat cards: Total, New, On Hold, Completed
- Table columns: ID, Title, Submission Date, Requester, Module, Status, Last Update Date
- Search by ID, title, or requester name
- Module + Status filters

### Dashboard
**Primary KPIs:**
- Total Requests
- Active Requests (New + In Progress + On Hold)
- Completed Requests
- Average Resolution Days

**Secondary KPIs:**
- Pending Approvals
- Overdue Items (7+ days)
- Cancellation Rate

**Charts:**
- Status distribution (bar)
- Module breakdown (pie)
- Recent activity stream (10 most recent)
- Smart alerts panel

---

## Authentication & Authorization

**Roles:**
- Super Admin - Full access
- Admin - Module-specific access
- Manager - View team requests, approve workflows
- Requester - Submit requests
- Viewer - Read-only access

---

## Technical Stack

- **Frontend:** Next.js 15, React 19, TypeScript
- **Styling:** Tailwind CSS, Shadcn/ui, Radix UI
- **Forms:** React Hook Form + Zod validation
- **Charts:** Recharts
- **Backend:** NestJS (planned), PostgreSQL + Prisma

---

## Current Status (v7 Seed)

**Mock Data: 34 records total**
- Shipping: 8
- HR: 8 (4 onboarding, 4 offboarding)
- Maintenance: 5
- Purchase: 4 (+ user-submitted via form)
- Event: 4
- Travel: 5

**Completed:**
- ✓ All module UIs with formal styling and full-width auto-sizing tables
- ✓ Standardized table columns (all 6 modules)
- ✓ HR, Maintenance, Purchase, Shipping forms — fully working submit via `submitRequest()`
- ✓ Dashboard with analytics (KPIs, charts, alerts, trend indicators)
- ✓ Inline status editing on all module list pages (module-aware statuses)
- ✓ Three-dot action menus with inline row expansion on all pages
- ✓ Unread comment indicators (badges + row highlight) on all pages
- ✓ Comment system: create, edit, delete, file attachments
- ✓ Stat card consistency across all modules (`rounded-xl p-5` standard)
- ✓ System font stack (no Google Fonts dependency)

**In Progress / Coming Soon:**
- [ ] Event and Travel create forms
- [ ] Zod schemas for Maintenance and Purchase
- [ ] NestJS backend integration (all modules currently use localStorage engine)
- [ ] Notifications system

---

## Success Criteria

1. All 6 modules fully functional with CRUD operations
2. Dashboard loads in < 2 seconds
3. New users can submit request within 3 minutes
4. 99.5% uptime
5. 80%+ user adoption within 30 days

