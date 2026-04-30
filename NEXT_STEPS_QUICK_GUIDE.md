# Next Steps - Quick Reference Guide

**Current Status:** Phase 1 Complete ✅  
**Next:** Phase 2 Integration (3-5 days)

---

## 🎯 What To Do Now

### Immediate (Next 15 minutes)

1. **Start Backend**
   ```bash
   cd d:/SWS/Git-Repos/admin-request-backend
   npm run start:dev
   # Should show: Admin Request Backend running on http://localhost:3001
   ```

2. **Start Frontend** (new terminal)
   ```bash
   cd d:/SWS/Git-Repos/admin-request-platform
   npm run dev
   # Should show: ▲ Next.js on http://localhost:3003
   ```

3. **Test Backend API**
   ```bash
   curl http://localhost:3001/api/requests/shipping
   # Should return: {"data":[],"total":0,"limit":50,"offset":0}
   ```

---

## 📋 Phase 2 Tasks (In Order)

### Day 1: Setup + Shipping (2-3 hours)

**STEP 1:** Create API Client
- File: `src/lib/apiClient.ts`
- Copy code from: `PHASE2_INTEGRATION_PLAN.md` → STEP 1
- Add `NEXT_PUBLIC_API_URL=http://localhost:3001/api` to `.env.local`

**STEP 2:** Wire Shipping Form
- File: `src/modules/shipping/ShippingForm.tsx`
- Replace the `onSubmit` function (lines ~188-212)
- Copy code from: `PHASE2_INTEGRATION_PLAN.md` → STEP 2

**STEP 3:** Wire Shipping List Page
- File: `src/app/(dashboard)/shipping/receiving/page.tsx`
- Add `useEffect` to fetch from backend
- Copy code from: `PHASE2_INTEGRATION_PLAN.md` → STEP 3

**Test:**
```bash
# 1. Fill out form at http://localhost:3003/shipping/receiving/new
# 2. Submit
# 3. Check http://localhost:3003/shipping/receiving - should see request
# 4. Check http://localhost:3001/api/requests/shipping - should see request
```

---

### Day 2: HR, Maintenance, Purchase (2-3 hours)

**STEP 4:** Wire HR Form & Page
- Copy pattern from shipping
- Files: `src/modules/hr/HRForm.tsx`, `src/app/(dashboard)/hr/page.tsx`
- Use module `'hr'` instead of `'shipping'`

**STEP 5:** Wire Maintenance Form & Page
- Same pattern
- Module: `'maintenance'`

**STEP 6:** Wire Purchase Form & Page
- Same pattern
- Module: `'purchase'`

---

### Day 3: Cross-Module Pages (1-2 hours)

**STEP 7:** Wire "My Requests" Page
- File: `src/app/(dashboard)/requests/page.tsx`
- Fetch from all 4 modules in parallel
- Code: `PHASE2_INTEGRATION_PLAN.md` → STEP 8

**STEP 8:** Wire "All Requests" Admin Page
- File: `src/app/(dashboard)/admin/all-requests/page.tsx`
- Same pattern as My Requests
- Code: `PHASE2_INTEGRATION_PLAN.md` → STEP 9

---

### Day 4: Detail Page + Testing (2-3 hours)

**STEP 9:** Create Request Detail Page
- File: `src/app/(dashboard)/requests/[id]/page.tsx`
- Show request details + comments + audit trail
- Code: `PHASE2_INTEGRATION_PLAN.md` → STEP 10

**Testing:**
- Test each form creates request
- Test each list page loads data
- Test detail page shows comments & history
- Test status updates
- Test filtering

---

## 📁 Files You'll Create/Modify

### New Files
```
✨ src/lib/apiClient.ts          ← Create this first
✨ src/app/(dashboard)/requests/[id]/page.tsx
```

### Modify (Copy form submit logic)
```
📝 src/modules/shipping/ShippingForm.tsx
📝 src/modules/hr/HRForm.tsx
📝 src/modules/maintenance/MaintenanceForm.tsx
📝 src/modules/purchase/PurchaseForm.tsx
```

### Modify (Add useEffect to fetch data)
```
📝 src/app/(dashboard)/shipping/receiving/page.tsx
📝 src/app/(dashboard)/hr/page.tsx
📝 src/app/(dashboard)/maintenance/page.tsx
📝 src/app/(dashboard)/purchase/page.tsx
📝 src/app/(dashboard)/requests/page.tsx
📝 src/app/(dashboard)/admin/all-requests/page.tsx
```

---

## 🔗 Code Templates

### Template 1: Update a Form
```typescript
import { requestsAPI } from '@/lib/apiClient'

const onSubmit = async (data: FormData) => {
  try {
    const created = await requestsAPI.create('MODULE_NAME', {
      title: data.title,
      description: data.notes,
      payload: data,
      requesterId: "USR-001", // TODO: Get from session
    })

    router.push(`/requests/${created.id}`)
    router.refresh()
  } catch (error) {
    console.error('Failed to create request:', error)
    // Show error to user
  }
}
```

### Template 2: Update a List Page
```typescript
'use client'
import { useEffect, useState } from 'react'
import { requestsAPI } from '@/lib/apiClient'

export default function ModulePage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await requestsAPI.listByModule('MODULE_NAME')
        setItems(data.data)
      } catch (error) {
        console.error('Failed to fetch:', error)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  return (
    <div>
      {loading && <p>Loading...</p>}
      {items.map(item => <div key={item.id}>{item.title}</div>)}
    </div>
  )
}
```

Replace `MODULE_NAME` with: `shipping`, `hr`, `maintenance`, or `purchase`

---

## 🧪 Testing Commands

### Test Backend
```bash
# List requests
curl http://localhost:3001/api/requests/shipping

# Create request
curl -X POST http://localhost:3001/api/requests/shipping \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","payload":{},"requesterId":"USR-001"}'

# Get request details
curl http://localhost:3001/api/requests/shipping/[ID]

# Get audit trail
curl http://localhost:3001/api/requests/shipping/[ID]/history

# Get comments
curl http://localhost:3001/api/requests/shipping/[ID]/comments
```

### Test Frontend
1. Open http://localhost:3003/shipping/receiving/new
2. Fill out form
3. Submit
4. Should redirect to /requests/[ID]
5. Should see request in list
6. Open http://localhost:3001/api/requests/shipping to verify

---

## ⚠️ Common Mistakes to Avoid

❌ **Don't:** Keep using `submitRequest()` function
✅ **Do:** Use `requestsAPI.create()`

❌ **Don't:** Fetch from `engineService.ts`
✅ **Do:** Fetch from backend API

❌ **Don't:** Use hardcoded mock data
✅ **Do:** Fetch from API, fallback to mock only if API fails

❌ **Don't:** Forget to handle loading/error states
✅ **Do:** Show loading spinner, display errors to user

❌ **Don't:** Use http://localhost:3001 in code
✅ **Do:** Use `NEXT_PUBLIC_API_URL` environment variable

---

## 🚨 If Something Breaks

### Backend won't start
```bash
# Check if port 3001 is in use
netstat -ano | findstr :3001

# Check database connection
npm run prisma:studio
```

### API calls fail
```bash
# Check backend is running
curl http://localhost:3001

# Check CORS is enabled (should see response)
curl -H "Origin: http://localhost:3003" http://localhost:3001/api/requests/shipping
```

### Form won't submit
```bash
# Check browser console for errors
# Check backend logs for request
# Use Postman to test API directly
```

### Data not showing in list
```bash
# Check backend has data
curl http://localhost:3001/api/requests/shipping

# Check frontend is fetching (add console.log)
# Check network tab in DevTools
```

---

## 📞 Reference Documents

Need more detail? Check:

| Document | Use For |
|----------|---------|
| **PHASE2_INTEGRATION_PLAN.md** | Step-by-step with full code |
| **BACKEND_OVERVIEW.md** | API endpoint details |
| **BACKEND_SETUP.md** | Backend troubleshooting |
| **FULL_STACK_SETUP.md** | Architecture overview |

---

## ✅ Phase 2 Success = When...

- ✅ All 4 forms POST to backend (instead of localStorage)
- ✅ All 4 list pages GET from backend
- ✅ Request detail page shows comments + history
- ✅ Status changes appear in audit trail
- ✅ No `localStorage` usage for requests (only sessions)
- ✅ All data persists in PostgreSQL
- ✅ End-to-end: Form → Database → List → Detail ✅

---

## 🏁 After Phase 2

### Phase 3: Advanced Features (Notifications + OAuth)
- Google OAuth setup
- Notification triggers
- Email sending

### But First...
- Test everything works
- Document any issues
- Commit all changes

---

## 💡 Tips for Success

1. **Go Step by Step** - Don't try to do everything at once
2. **Test After Each Step** - Verify form works before moving on
3. **Use Console Logs** - Add `console.log` to debug
4. **Check Network Tab** - Browser DevTools → Network to see API calls
5. **Test with cURL** - Easier than frontend to test backend
6. **Keep Terminal Visible** - Watch backend logs while testing

---

**Ready? Start with STEP 1 → Create `src/lib/apiClient.ts`**

Good luck! 🚀
