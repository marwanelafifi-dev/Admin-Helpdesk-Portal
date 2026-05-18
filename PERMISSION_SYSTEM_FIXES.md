# Permission System - Comprehensive Fixes

## Changes Made to Fix Permission System

### 1. Fixed Status Update Permission Bug
**File:** `src/app/(dashboard)/requests/[id]/page.tsx`
**Line:** 184
**Issue:** Status dropdown wasn't working for Full Access role
**Before:**
```typescript
const canChangeStatus = session?.user?.permissions && hasPermission(session.user.permissions, "update")
```
**After:**
```typescript
const canChangeStatus = session?.user?.permissions && hasPermission(session.user.permissions, "update_status")
```
**Reason:** The permission stored in database and roles is "update_status" but code was checking for "update"

---

### 2. Added Missing Permission Types
**File:** `src/lib/access.ts`
**Lines:** 24-26
**Issue:** `update_status`, `cancel_request`, and `edit_request` were not defined in `RoutePermission` type
**Added:**
```typescript
| "update_status"
| "cancel_request"
| "edit_request"
```
**Reason:** TypeScript needs all permission strings defined in the type union

---

### 3. Added Edit Request Permission Check
**File:** `src/app/(dashboard)/requests/[id]/page.tsx`
**Line:** 187
**Issue:** Edit button was always showing regardless of user permissions
**Added:**
```typescript
const canEditRequest = session?.user?.permissions && hasPermission(session.user.permissions, "edit_request")
```
**Usage:** Controls visibility of Edit button on request detail page

---

### 4. Made Edit Button Conditional on All Module Pages
**Files Changed:**
- `src/app/(dashboard)/hr/page.tsx`
- `src/app/(dashboard)/maintenance/page.tsx`
- `src/app/(dashboard)/purchase/page.tsx`
- `src/app/(dashboard)/event/page.tsx`
- `src/app/(dashboard)/travel/page.tsx`
- `src/app/(dashboard)/shipping/page.tsx`
- `src/app/(dashboard)/shipping/receiving/page.tsx`
- `src/app/(dashboard)/admin/all-requests/page.tsx`

**Change:** Added `canEditRequest` permission check and made `onEdit` prop conditional:
```typescript
// Before
onEdit={(id) => window.open(`/requests/${id}`, '_blank')}

// After
onEdit={canEditRequest ? (id) => window.open(`/requests/${id}`, '_blank') : undefined}
```
**Reason:** Edit button in three-dot menu should only appear if user has `edit_request` permission

---

### 5. Added Edit Request Permission to Role Definitions
**File:** `src/lib/userRoles.ts`
**Changes:**
- Added `"edit_request"` to Admin role permissions (line 29)
- Added `"edit_request"` to Manager role permissions (line 50)
- Kept `"edit_request"` out of Requester and Viewer roles

**Reason:** Only admin and manager should be able to edit requests

---

### 6. Added Edit Button to Request Detail Page
**File:** `src/app/(dashboard)/requests/[id]/page.tsx`
**Lines:** 479-485
**Added:**
```typescript
{/* Edit Button */}
{canEditRequest && (
  <Button
    variant="outline"
    onClick={() => window.open(`/${request.module}/new?id=${request.id}`, '_blank')}
    className="ml-auto"
  >
    Edit
  </Button>
)}
```
**Reason:** Users should be able to edit requests from the detail page if they have permission

---

## How Permission System Works

### Permission Check Flow
1. User logs in via NextAuth
2. Session includes user's role from database
3. `getPermissionsForRole()` fetches permissions from `prisma.role` table
4. If no database role, falls back to `DEFAULT_ROLE_PERMISSIONS`
5. `hasPermission()` checks if user has specific permission or wildcard `"*"`

### Permission Types
**Page Access:**
- `page:dashboard`
- `page:all-requests`
- `page:my-requests`
- `page:request-detail`
- `page:shipping`, `page:shipping-new`, `page:shipping-sending`, `page:shipping-receiving`
- `page:hr`, `page:hr-new`
- `page:maintenance`, `page:maintenance-new`
- `page:purchase`, `page:purchase-new`
- `page:event`
- `page:travel`
- `page:admin-users`, `page:admin-roles`, `page:admin-settings`

**Action Permissions:**
- `create` - Create new requests
- `read` - Read requests
- `read_own` - Read own requests only
- `update` - Update request details
- `delete` - Delete requests
- `approve` - Approve requests
- `reject` - Reject requests
- `update_status` - Change request status (inline editing)
- `cancel_request` - Cancel requests
- `edit_request` - Edit existing requests
- `manage_users` - Manage user accounts
- `manage_roles` - Manage roles
- `activity` - View activity history
- `settings` - Access settings

---

## Default Role Permissions

### Super Admin
```json
["*"]
```
Full access to everything.

### Admin
```json
[
  "page:dashboard",
  "page:all-requests",
  "page:my-requests",
  "page:request-detail",
  "page:shipping", "page:shipping-new", "page:shipping-sending", "page:shipping-receiving",
  "page:hr", "page:hr-new",
  "page:maintenance", "page:maintenance-new",
  "page:purchase", "page:purchase-new",
  "page:event",
  "page:travel",
  "page:admin-users",
  "page:admin-settings",
  "manage_users",
  "update_status",
  "cancel_request",
  "edit_request"
]
```

### Manager
```json
[
  "page:dashboard",
  "page:all-requests",
  "page:my-requests",
  "page:request-detail",
  "page:shipping", "page:shipping-new", "page:shipping-sending", "page:shipping-receiving",
  "page:hr", "page:hr-new",
  "page:maintenance", "page:maintenance-new",
  "page:purchase", "page:purchase-new",
  "page:event",
  "page:travel",
  "update_status",
  "cancel_request",
  "edit_request"
]
```

### Requester
```json
[
  "page:dashboard",
  "page:my-requests",
  "page:request-detail",
  "page:shipping",
  "page:shipping-receiving",
  "page:purchase",
  "page:purchase-new",
  "page:travel"
]
```

### Viewer
```json
[
  "page:dashboard",
  "page:my-requests",
  "page:request-detail"
]
```

---

## Testing the Permission System

### 1. Create Test Users
Create users with different roles:
- Super Admin User
- Admin User
- Manager User
- Requester User
- Viewer User

### 2. Test Each Role
Log in as each user and verify:

**Super Admin:**
- All pages accessible
- Can update status inline on all pages
- Can edit all requests
- Can cancel all requests
- Can manage users and roles

**Admin:**
- All module pages accessible
- Can update status inline
- Can edit requests
- Can cancel requests
- Can manage users (but not roles)

**Manager:**
- All module pages accessible (no admin area)
- Can update status inline
- Can edit requests
- Can cancel requests
- Cannot manage users/roles

**Requester:**
- Only My Requests, Shipping, Purchase, Travel accessible
- CANNOT update status inline
- CANNOT see Edit button
- CANNOT see Cancel option

**Viewer:**
- Only Dashboard and My Requests accessible
- Cannot create or modify anything
- Can only view

### 3. Test Role Modifications
1. Go to Admin > Roles
2. Select a custom role like "Full Access"
3. UNCHECK "Update Status" permission
4. Log in as user with that role
5. Verify status dropdown is disabled on all pages
6. Verify other features still work

---

## Database Persistence

When roles are modified in the Admin > Roles page:
1. Changes are saved to `prisma.role` table
2. Next time user logs in or page refreshes, new permissions are fetched
3. All users with that role get the new permissions immediately
4. Changes are not cached - always fetch fresh from database

---

## Known Limitations

1. **Default Roles Cannot Be Edited in UI:** The built-in roles (super_admin, admin, manager, requester, viewer) use `DEFAULT_ROLE_PERMISSIONS` as fallback. To change them, modify `src/lib/userRoles.ts` directly.

2. **Custom Roles Must Be Created via Admin UI:** New roles are created through Admin > Roles page and stored in database.

3. **Permission Names Are Case-Sensitive:** When checking permissions, use exact lowercase names like "update_status", not "Update Status".

4. **Wildcard Permission (`"*"`) Grants Everything:** Super Admin has `["*"]` which bypasses all checks.

---

## Future Improvements

1. **Role Hierarchy:** Implement role inheritance (Manager inherits Admin permissions)
2. **Dynamic Permissions:** Add ability to define custom permissions per organization
3. **Audit Trail:** Log who changed permissions and when
4. **Permission UI Validation:** Prevent removing required permissions from roles
5. **Batch Permission Updates:** Update multiple users' roles at once
