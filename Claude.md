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
- [ ] **Maintenance Module:** - [ ] Define Zod Schema for ticket fields.
    - [ ] Implement NestJS CRUD endpoints.
    - [ ] Build Ticket Management UI.
- [ ] **Purchase Module:** - [ ] Define Zod Schema for PO/Budget fields.
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
### Development Loop (Repeat for each module)
1. **Sync Plan:** Update this `ROADMAP.md`.
2. **Define Schema:** Create/Update `Zod` schemas.
3. **Execute:** Write NestJS code & DB migrations.
4. **Verify:** Test against Audit Logs and JSONB validation.

