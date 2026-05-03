# Database Implementation Roadmap

## Overview
Move from localStorage mock data to persistent database using PostgreSQL + Prisma ORM. Implementation focuses on 4 core modules: **Shipping, HR, Maintenance, and Purchase**.

**Current State:** All modules use localStorage with mock data  
**Target State:** PostgreSQL database with Prisma ORM + NestJS API

---

## Phase 1: Setup & Infrastructure (Week 1)

### 1.1 Prisma Installation & Configuration
```bash
npm install @prisma/client
npm install -D prisma
npx prisma init
```

**Tasks:**
- [ ] Install Prisma and PostgreSQL adapter
- [ ] Create `.env.local` with database connection string
- [ ] Configure Prisma schema (`prisma/schema.prisma`)
- [ ] Set up PostgreSQL database (local development)
- [ ] Create initial migration

**Deliverables:**
- `.env.local` with `DATABASE_URL`
- `prisma/schema.prisma` stub
- Initial database connection verified

---

## Phase 2: Database Schema Design (Week 1-2)

### 2.1 Core Tables (All Modules)

**Users Table**
```prisma
model User {
  id        String    @id @default(cuid())
  name      String
  email     String    @unique
  role      String    // "Super Admin", "Admin", "Manager", "Requester", "Viewer"
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  
  requests      Request[]
  approvals     Approval[]
}
```

**Requests Table (Polymorphic)**
```prisma
model Request {
  id            String   @id @default(cuid())
  module        String   // "shipping", "hr", "maintenance", "purchase"
  type          String   // Module-specific type
  title         String
  status        String   // "new", "on_hold", "in_progress", "completed", "cancelled"
  
  requesterId   String
  requester     User     @relation(fields: [requesterId], references: [id])
  
  payload       Json     // Module-specific fields
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  attachments   Attachment[]
  approvals     Approval[]
  history       RequestHistory[]
}
```

**Attachments Table**
```prisma
model Attachment {
  id        String   @id @default(cuid())
  requestId String
  request   Request  @relation(fields: [requestId], references: [id], onDelete: Cascade)
  
  name      String
  url       String
  category  String   // "awb", "invoice", "other"
  mimeType  String
  sizeBytes Int
  
  uploadedAt DateTime @default(now())
  uploadedBy String   // userId
}
```

**Approvals Table**
```prisma
model Approval {
  id        String   @id @default(cuid())
  requestId String
  request   Request  @relation(fields: [requestId], references: [id], onDelete: Cascade)
  
  approverId String
  approver   User     @relation(fields: [approverId], references: [id])
  
  role      String   // "directManager", "techManager", "pm"
  status    String   // "pending", "approved", "rejected"
  comments  String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Request History (Audit Trail)**
```prisma
model RequestHistory {
  id        String   @id @default(cuid())
  requestId String
  request   Request  @relation(fields: [requestId], references: [id], onDelete: Cascade)
  
  action    String   // "created", "status_changed", "approved", "rejected"
  oldValue  Json?
  newValue  Json?
  
  changedBy String
  createdAt DateTime @default(now())
}
```

### 2.2 Module-Specific Schema Details

#### **Shipping Module**
**Payload Structure:**
```json
{
  "supplier": "Supplier A",
  "costCenter": "CC-001",
  "poNumber": "PO-12345",
  "carrier": "DHL",
  "trackingNumber": "DHL123456",
  "carrierName": "DHL Express",
  "description": "Electronics shipment",
  "expectedPickupDate": "2026-05-01",
  "expectedDeliveryDate": "2026-05-15",
  "ccEmails": ["manager@si-ware.com"],
  "approvers": {
    "directManager": {"userId": "...", "name": "...", "email": "..."},
    "techManager": [...],
    "pm": [...]
  }
}
```

**Database Indices:**
- `Request(module, status)` - Fast filtering
- `Request(requesterId, createdAt)` - User requests
- `Attachment(requestId, category)` - Document lookup

---

#### **HR Module**
**Payload Structure:**
```json
{
  "hrType": "onboarding",
  "employeeName": "John Doe",
  "employeeId": "EMP-001",
  "mobileNumber": "+966-512345678",
  "nationalIdNumber": "1234567890",
  "jobTitle": "Software Engineer",
  "employmentType": "Full Time",
  "directManager": "Manager Name",
  "sector": "IT",
  "department": "Engineering",
  "entity": "KSA",
  "startDate": "2026-06-01",
  "items": ["Medical Insurance for New Hire", "Access Card", "Seating Assignment"],
  "attachments": [...],
  "notes": "Onboarding notes"
}
```

**Database Indices:**
- `Request(module, type)` - Onboarding vs Offboarding
- `Request(module, status, type)` - Quick counts

---

#### **Maintenance Module**
**Payload Structure:**
```json
{
  "description": "HVAC system needs repair",
  "priority": "High",
  "location": "Building A, Floor 3",
  "requestedDate": "2026-05-01",
  "targetCompletionDate": "2026-05-05",
  "assignedTo": "Maintenance Team",
  "notes": "System not cooling properly"
}
```

**Database Indices:**
- `Request(module, priority)` - Priority filtering
- `Request(module, status)` - Status filtering

---

#### **Purchase Module**
**Payload Structure:**
```json
{
  "purchaseType": "online",
  "supplier": "Amazon",
  "title": "Laptop Computer",
  "description": "Dell XPS 15 for development",
  "estimatedPrice": 5000,
  "currency": "EGP",
  "costCenter": "CC-001",
  "budget": 10000,
  "expectedDeliveryDate": "2026-05-10",
  "ccEmails": ["finance@si-ware.com"],
  "notes": "For new hire"
}
```

**Database Indices:**
- `Request(module, status)` - Status filtering
- `Request(module, createdAt)` - Timeline sorting

---

## Phase 3: API Implementation (Week 2-3)

### 3.1 NestJS API Endpoints

**Base Structure:**
```
POST   /api/requests/:module              - Create request
GET    /api/requests/:module              - List requests (with filtering)
GET    /api/requests/:module/:id          - Get single request
PATCH  /api/requests/:module/:id          - Update request
DELETE /api/requests/:module/:id          - Delete request
POST   /api/requests/:module/:id/approve  - Approve request
POST   /api/requests/:module/:id/reject   - Reject request
```

### 3.2 Implementation Order

**Priority 1: Core Infrastructure**
- [ ] Prisma client setup
- [ ] Request model queries
- [ ] User authentication middleware
- [ ] Error handling pipeline

**Priority 2: Shipping Module**
- [ ] List shipments with filters (status, carrier, date range)
- [ ] Create shipment request (with validation)
- [ ] Update shipment status
- [ ] Fetch single shipment with attachments
- [ ] Approval workflow

**Priority 3: HR Module**
- [ ] List HR requests (with onboarding/offboarding filter)
- [ ] Create onboarding request
- [ ] Create offboarding request
- [ ] Update HR request status
- [ ] Fetch single HR request

**Priority 4: Maintenance Module**
- [ ] List maintenance tickets
- [ ] Create maintenance ticket
- [ ] Update ticket status and priority
- [ ] Assign ticket to team

**Priority 5: Purchase Module**
- [ ] List purchase orders
- [ ] Create purchase order
- [ ] Update order status
- [ ] Validate budget constraints
- [ ] Fetch single order

---

## Phase 4: Frontend Integration (Week 3-4)

### 4.1 API Service Layer
Replace `engineService.ts` with API client:

```typescript
// src/services/api/client.ts
export async function getShipments(filters?: FilterOptions) {
  const response = await fetch('/api/requests/shipping', { 
    method: 'GET',
    params: filters 
  })
  return response.json()
}

export async function createShipment(payload: ShippingPayload) {
  const response = await fetch('/api/requests/shipping', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
  return response.json()
}
```

### 4.2 Page Updates
- [ ] Update `/shipping/receiving/page.tsx` - Replace mock data with API calls
- [ ] Update `/shipping/sending/page.tsx` - Keep Coming Soon (for now)
- [ ] Update `/hr/page.tsx` - Replace mock data with API calls
- [ ] Update `/maintenance/page.tsx` - Replace mock data with API calls
- [ ] Update `/purchase/page.tsx` - Replace mock data with API calls
- [ ] Update `/requests/page.tsx` (My Requests) - Cross-module API calls
- [ ] Update `/admin/all-requests/page.tsx` - Admin view with API

### 4.3 Form Integration
- [ ] Update `ShippingForm` - Submit to `/api/requests/shipping`
- [ ] Create HR form endpoints - `/api/requests/hr`
- [ ] Create Maintenance form endpoints - `/api/requests/maintenance`
- [ ] Create Purchase form endpoints - `/api/requests/purchase`

---

## Phase 5: Testing & Migration (Week 4)

### 5.1 Data Migration
- [ ] Export mock data to JSON
- [ ] Create seed script (`prisma/seed.ts`)
- [ ] Seed development database with realistic data
- [ ] Verify data integrity

### 5.2 Testing
- [ ] Unit tests for API endpoints
- [ ] Integration tests (API + Database)
- [ ] E2E tests for critical flows
- [ ] Performance testing on large datasets

### 5.3 Deployment
- [ ] Production database setup
- [ ] Environment configuration
- [ ] Database backups strategy
- [ ] Deployment pipeline

---

## Implementation Dependencies

### Must Install
```bash
npm install @prisma/client @nestjs/core @nestjs/common
npm install -D prisma @types/node
npm install pg # PostgreSQL driver
```

### Database Setup (Local)
```bash
# Option 1: Docker PostgreSQL
docker run --name admin-platform-db -e POSTGRES_PASSWORD=postgres -d -p 5432:5432 postgres:latest

# Option 2: PostgreSQL server
# Create database: admin_request_platform
# Connection string: postgresql://user:password@localhost:5432/admin_request_platform
```

---

## Estimated Timeline

| Phase | Duration | Modules |
|-------|----------|---------|
| Phase 1: Setup | 2-3 days | Infrastructure |
| Phase 2: Schema | 3-4 days | Database design |
| Phase 3: API | 5-7 days | Shipping → HR → Maintenance → Purchase |
| Phase 4: Frontend | 4-5 days | Page + Form integration |
| Phase 5: Testing | 2-3 days | Migration + QA |
| **Total** | **3-4 weeks** | **All 4 modules** |

---

## Success Criteria

✓ All 4 modules persisting data to PostgreSQL  
✓ CRUD operations working for each module  
✓ Approval workflows functional  
✓ Attachment storage working  
✓ Audit trail recording changes  
✓ API tests passing (>90% coverage)  
✓ Zero data loss during migration  
✓ Performance: API responses < 500ms for typical queries  

---

## Next Steps (Immediate)

1. **Install Dependencies**
   ```bash
   npm install @prisma/client
   npm install -D prisma
   ```

2. **Set Up Prisma**
   ```bash
   npx prisma init
   ```

3. **Configure Database**
   - Set up PostgreSQL (Docker or local)
   - Add `DATABASE_URL` to `.env.local`

4. **Design Prisma Schema**
   - Create `prisma/schema.prisma`
   - Model all core tables + module payloads

5. **Create First Migration**
   ```bash
   npx prisma migrate dev --name init
   ```

6. **Generate Prisma Client**
   ```bash
   npx prisma generate
   ```

---

## Recommendations

### Architecture Pattern
Use **API Layer Architecture**:
- Frontend (Next.js) → API Routes → Prisma Client → PostgreSQL
- Keep forms unchanged; only submission changes to API
- Maintain type safety with Zod + Prisma types

### Module Priority (Recommended)
1. **Shipping** - Most complex (attachments, approvals)
2. **HR** - Moderate complexity (polymorphic types)
3. **Maintenance** - Simple CRUD
4. **Purchase** - Simple CRUD with budget logic

### Best Practices
- Use Prisma transactions for multi-table operations
- Index frequently queried columns
- Implement soft deletes for audit trail
- Cache frequently accessed data (Redis later)
- Log all API calls for debugging

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Data loss during migration | Test migration script on copy; maintain backup |
| Performance degradation | Profile queries early; add indices proactively |
| Schema changes required | Design schema carefully; version migrations |
| Breaking API changes | Semantic versioning; deprecation period |

---

## Questions to Clarify

1. **PostgreSQL Setup**: Local/Docker/Cloud (AWS RDS, Azure, etc.)?
2. **Authentication**: JWT, Session-based, or OAuth?
3. **File Storage**: Local filesystem, S3, or cloud storage?
4. **Timeline**: Can you allocate 3-4 weeks for full implementation?
5. **Team**: Is there a backend team, or will frontend team build API?

---

**Status:** Ready to begin Phase 1  
**Last Updated:** 2026-04-29  
**Next Review:** After Phase 1 completion
