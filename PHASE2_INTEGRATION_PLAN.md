# Phase 2: Integration Plan - Frontend to Backend

**Duration:** 3-5 days  
**Goal:** Wire all frontend forms and pages to backend API  
**Status:** Ready to begin  

---

## Overview

You have:
- ✅ Frontend (Next.js) with forms & pages
- ✅ Backend (NestJS) with 15 API endpoints
- ✅ Database (PostgreSQL) with Prisma
- ✅ Both running and ready to communicate

**Now:** Replace localStorage calls with API calls

---

## Step-by-Step Plan

### **STEP 1: Update Environment Configuration** (15 min)

**File:** `src/lib/apiClient.ts` (NEW)

Create a centralized API client to call backend:

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export async function apiCall<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`)
  }

  return response.json()
}

// Requests API
export const requestsAPI = {
  listByModule: (module: string, status?: string) =>
    apiCall(`/requests/${module}?${status ? `status=${status}` : ''}`),
  
  getOne: (module: string, id: string) =>
    apiCall(`/requests/${module}/${id}`),
  
  create: (module: string, data: any) =>
    apiCall(`/requests/${module}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  updateStatus: (module: string, id: string, status: string) =>
    apiCall(`/requests/${module}/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
}

// Comments API
export const commentsAPI = {
  listByRequest: (module: string, requestId: string) =>
    apiCall(`/requests/${module}/${requestId}/comments`),
  
  create: (module: string, requestId: string, data: any) =>
    apiCall(`/requests/${module}/${requestId}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

// History API
export const historyAPI = {
  getByRequest: (module: string, requestId: string) =>
    apiCall(`/requests/${module}/${requestId}/history`),
}
```

**File:** `.env.local`

Add API URL:
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

---

### **STEP 2: Update Shipping Form** (30 min)

**File:** `src/modules/shipping/ShippingForm.tsx`

Replace the submit logic:

```typescript
// OLD: Replace this
const request: EngineRequest = submitRequest('shipping', payload as unknown as Record<string, unknown>, {
  title: payload.title,
  requesterId: "USR-001",
  requesterName: "Marwan Elafifi",
  requesterEmail: "marwan.elafifi@si-ware.com",
})

if (request?.id) {
  router.push("/requests")
  router.refresh()
}

// NEW: With this
import { requestsAPI } from '@/lib/apiClient'

const onSubmit = async (data: ShippingRequestForm) => {
  try {
    if (!hasRequiredDocs(stagedFiles)) {
      setError("attachments", { type: "manual", message: "AWB and Commercial Invoice are both required." })
      return
    }
    clearErrors("attachments")

    const payload = {
      ...data,
      approvers: mapApprovers(data.approvers),
      attachments: buildAttachmentPayload(stagedFiles),
    }

    const created = await requestsAPI.create('shipping', {
      title: payload.title,
      description: payload.notes,
      payload: payload,
      requesterId: "USR-001", // TODO: Get from session
    })

    router.push(`/requests/${created.id}`)
    router.refresh()
  } catch (error) {
    console.error('Failed to create request:', error)
    setError('title', { 
      type: 'manual', 
      message: 'Failed to create request. Please try again.' 
    })
  }
}
```

---

### **STEP 3: Update Shipping Receiving Page** (30 min)

**File:** `src/app/(dashboard)/shipping/receiving/page.tsx`

Replace mock data fetching:

```typescript
// OLD: Using mock data
const mockShipments = [...]

// NEW: Using API
'use client'

import { useEffect, useState } from 'react'
import { requestsAPI } from '@/lib/apiClient'

export default function ReceivingPage() {
  const [shipments, setShipments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchShipments = async () => {
      try {
        setLoading(true)
        const data = await requestsAPI.listByModule('shipping')
        setShipments(data.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch shipments')
        // Fallback to mock data if API fails
        setShipments(mockShipments)
      } finally {
        setLoading(false)
      }
    }

    fetchShipments()
  }, [])

  // Rest of component unchanged
  return (
    <div className="space-y-6">
      {/* Header */}
      {/* Stat cards */}
      {/* Table - use shipments instead of mockShipments */}
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">{error}</div>}
      {/* ... existing table code ... */}
    </div>
  )
}
```

---

### **STEP 4: Update HR Form** (20 min)

**File:** `src/modules/hr/HRForm.tsx`

Similar pattern to ShippingForm:

```typescript
const onSubmit = async (data: HRFormData) => {
  try {
    const created = await requestsAPI.create('hr', {
      title: `${data.hrType === 'onboarding' ? 'Onboarding' : 'Offboarding'}: ${data.employeeName}`,
      payload: data,
      requesterId: "USR-001",
    })

    router.push(`/requests/${created.id}`)
    router.refresh()
  } catch (error) {
    // Error handling
  }
}
```

---

### **STEP 5: Update HR Page** (20 min)

**File:** `src/app/(dashboard)/hr/page.tsx`

```typescript
useEffect(() => {
  const fetchRequests = async () => {
    try {
      const data = await requestsAPI.listByModule('hr')
      setHrRequests(data.data)
    } catch (error) {
      setHrRequests(mockHRRequests) // Fallback
    }
  }

  fetchRequests()
}, [])
```

---

### **STEP 6: Update Maintenance Form & Page** (20 min)

Same pattern as HR:
- Create → POST to `/api/requests/maintenance`
- List → GET from `/api/requests/maintenance`

**File:** `src/modules/maintenance/MaintenanceForm.tsx`
**File:** `src/app/(dashboard)/maintenance/page.tsx`

---

### **STEP 7: Update Purchase Form & Page** (20 min)

Same pattern:

**File:** `src/modules/purchase/PurchaseForm.tsx`
**File:** `src/app/(dashboard)/purchase/page.tsx`

---

### **STEP 8: Update "My Requests" Page** (20 min)

**File:** `src/app/(dashboard)/requests/page.tsx`

Fetch from all modules:

```typescript
useEffect(() => {
  const fetchAll = async () => {
    try {
      const [shipping, hr, maint, purchase] = await Promise.all([
        requestsAPI.listByModule('shipping', { requesterId: 'USR-001' }),
        requestsAPI.listByModule('hr', { requesterId: 'USR-001' }),
        requestsAPI.listByModule('maintenance', { requesterId: 'USR-001' }),
        requestsAPI.listByModule('purchase', { requesterId: 'USR-001' }),
      ])

      const allRequests = [
        ...shipping.data,
        ...hr.data,
        ...maint.data,
        ...purchase.data,
      ]

      setRequests(allRequests)
    } catch (error) {
      // Fallback to mock
    }
  }

  fetchAll()
}, [])
```

---

### **STEP 9: Update "All Requests" Admin Page** (20 min)

**File:** `src/app/(dashboard)/admin/all-requests/page.tsx`

```typescript
useEffect(() => {
  const fetchAll = async () => {
    try {
      const [shipping, hr, maint, purchase] = await Promise.all([
        requestsAPI.listByModule('shipping'),
        requestsAPI.listByModule('hr'),
        requestsAPI.listByModule('maintenance'),
        requestsAPI.listByModule('purchase'),
      ])

      const allRequests = [
        ...shipping.data,
        ...hr.data,
        ...maint.data,
        ...purchase.data,
      ]

      setRequests(allRequests)
    } catch (error) {
      // Fallback
    }
  }

  fetchAll()
}, [])
```

---

### **STEP 10: Create Request Detail Page** (1 hour)

**File:** `src/app/(dashboard)/requests/[id]/page.tsx` (NEW)

This page will show:
- Request details
- Comments section
- Audit trail (history)
- Status update button

```typescript
'use client'

import { useEffect, useState } from 'react'
import { requestsAPI, commentsAPI, historyAPI } from '@/lib/apiClient'

export default function RequestDetailPage({ params }: { params: { id: string } }) {
  const [request, setRequest] = useState(null)
  const [comments, setComments] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Need to know the module - can parse from URL or fetch all
        const module = 'shipping' // TODO: Get from URL or parent
        
        const [req, coms, hist] = await Promise.all([
          requestsAPI.getOne(module, params.id),
          commentsAPI.listByRequest(module, params.id),
          historyAPI.getByRequest(module, params.id),
        ])

        setRequest(req)
        setComments(coms.data)
        setHistory(hist.data)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [params.id])

  if (loading) return <div>Loading...</div>
  if (!request) return <div>Request not found</div>

  return (
    <div className="space-y-6">
      {/* Request Details */}
      <RequestDetails request={request} />

      {/* Tabs: Details, Comments, History */}
      <div className="grid grid-cols-3 gap-4">
        <DetailsTab request={request} />
        <CommentsTab comments={comments} requestId={params.id} />
        <HistoryTab history={history} />
      </div>
    </div>
  )
}
```

---

## Testing Checklist

After completing each step:

- [ ] Backend running on port 3001
- [ ] Frontend running on port 3003
- [ ] Database has test data (or start fresh)

### Test Shipping Form
- [ ] Fill out form
- [ ] Upload AWB + Invoice
- [ ] Submit
- [ ] Check database (Prisma Studio)
- [ ] Verify request appears in list

### Test Shipping List
- [ ] Page loads shipments from backend
- [ ] Filter by status works
- [ ] Click request → goes to detail page

### Test Comments
- [ ] Add comment to request
- [ ] See comment in list
- [ ] Edit comment
- [ ] Delete comment

### Test Audit Trail
- [ ] Create request → see "created" in history
- [ ] Update status → see "status_changed" in history
- [ ] Each entry shows user + timestamp

---

## Troubleshooting

### API calls fail with CORS error
**Solution:** Check backend CORS config in `src/main.ts`
```typescript
app.enableCors({
  origin: ['http://localhost:3003', 'http://localhost:3000'],
  credentials: true,
})
```

### Backend returns 404
**Solution:** Check endpoint path matches exactly
```
/api/requests/shipping ✅
/api/requests/shipping/ ✗ (extra slash)
```

### Data doesn't appear after submit
**Solution:** Check backend logs
```bash
npm run start:dev
# Should show "POST /api/requests/shipping"
```

### Database empty
**Solution:** Create test data via API
```bash
curl -X POST http://localhost:3001/api/requests/shipping \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test",
    "payload": {"supplier": "Test"},
    "requesterId": "USR-001"
  }'
```

---

## Timeline

| Step | Task | Duration | Day |
|------|------|----------|-----|
| 1 | API Client Setup | 15 min | Day 1 |
| 2 | Shipping Form | 30 min | Day 1 |
| 3 | Shipping Page | 30 min | Day 1 |
| 4 | HR Form | 20 min | Day 2 |
| 5 | HR Page | 20 min | Day 2 |
| 6 | Maintenance | 20 min | Day 2 |
| 7 | Purchase | 20 min | Day 2 |
| 8 | My Requests | 20 min | Day 3 |
| 9 | All Requests | 20 min | Day 3 |
| 10 | Detail Page + Comments + History | 1 hour | Day 3-4 |
| | Testing & Debugging | 2-3 hours | Day 4-5 |
| | **TOTAL** | **~8 hours** | **3-5 days** |

---

## Deliverables (Phase 2)

✅ All forms POST to backend  
✅ All list pages GET from backend  
✅ Request detail page with comments  
✅ Audit trail visible in UI  
✅ Status updates persist to database  
✅ Zero localStorage usage (except session)  
✅ Full end-to-end data flow working  

---

## Before You Start

### Checklist
- [ ] Backend repo cloned and running
- [ ] Frontend repo ready
- [ ] PostgreSQL running locally
- [ ] Terminal 1: `npm run start:dev` (backend)
- [ ] Terminal 2: `npm run dev` (frontend)
- [ ] Test: `curl http://localhost:3001/api/requests/shipping` returns `{}`

### Create Test Request via API
```bash
curl -X POST http://localhost:3001/api/requests/shipping \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Initial Test",
    "description": "Testing API",
    "payload": {"supplier": "TestCo"},
    "requesterId": "USR-001"
  }'
```

If successful, you'll get back the created request with an ID. Use that ID to test GET:

```bash
curl http://localhost:3001/api/requests/shipping/[ID]
```

---

## Start Phase 2!

Ready? Follow these steps in order:

1. **Create `src/lib/apiClient.ts`** (Step 1)
2. **Update `.env.local`** (Step 1)
3. **Update ShippingForm.tsx** (Step 2)
4. **Test form submit** → Check backend logs
5. **Update shipping/receiving/page.tsx** (Step 3)
6. **Test page loads data** → Should show request from API
7. Repeat for other modules (Steps 4-7)
8. Build detail page with comments & history (Step 10)
9. Test end-to-end

**Estimated Time:** 3-5 days to complete

Good luck! 🚀
