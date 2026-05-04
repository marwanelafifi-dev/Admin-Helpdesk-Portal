# Role Permissions Testing Checklist

## Overview
This document defines the expected behavior for each role in the Admin Request Platform. Test each role by logging in with a user assigned to that role and verifying all permissions work as expected.

---

## 1. SUPER ADMIN
**Permissions:** `["*"]` (All permissions)

### Pages Accessible
- ✅ Dashboard
- ✅ All Requests
- ✅ My Requests
- ✅ Request Detail
- ✅ Shipping (List & New)
- ✅ HR (List & New)
- ✅ Maintenance (List & New)
- ✅ Purchase (List & New)
- ✅ Event
- ✅ Travel
- ✅ Admin > Users
- ✅ Admin > Roles
- ✅ Admin > Settings

### Actions Available
- ✅ Create requests in all modules
- ✅ Read all requests
- ✅ Update inline status on all module pages
- ✅ Edit requests (Edit button visible)
- ✅ Cancel requests
- ✅ View activity history
- ✅ Add comments
- ✅ Manage users
- ✅ Manage roles
- ✅ Access settings

### Test Steps
1. Log in as Super Admin user
2. Navigate to each module page (Shipping, HR, Maintenance, Purchase, Event, Travel)
3. Verify inline status dropdown appears on all rows
4. Verify Edit button appears in three-dot menu
5. Verify Cancel option appears in three-dot menu
6. Click Edit to open request detail page
7. Verify Edit button appears on request detail page
8. Verify status dropdown works on request detail page

---

## 2. ADMIN
**Permissions:** `["page:dashboard", "page:all-requests", "page:my-requests", "page:request-detail", "page:shipping", "page:shipping-new", "page:shipping-sending", "page:shipping-receiving", "page:hr", "page:hr-new", "page:maintenance", "page:maintenance-new", "page:purchase", "page:purchase-new", "page:event", "page:travel", "page:admin-users", "page:admin-settings", "manage_users", "update_status", "cancel_request", "edit_request"]`

### Pages Accessible
- ✅ Dashboard
- ✅ All Requests
- ✅ My Requests
- ✅ Request Detail
- ✅ Shipping (List & New)
- ✅ HR (List & New)
- ✅ Maintenance (List & New)
- ✅ Purchase (List & New)
- ✅ Event
- ✅ Travel
- ✅ Admin > Users
- ✅ Admin > Settings
- ❌ Admin > Roles (NOT accessible)

### Actions Available
- ✅ Create requests in all modules
- ✅ Update inline status on all module pages
- ✅ Edit requests
- ✅ Cancel requests
- ✅ View activity history
- ✅ Add comments
- ✅ Manage users
- ❌ Manage roles

### Test Steps
1. Log in as Admin user
2. Navigate to Shipping, HR, Maintenance, Purchase, Event, Travel pages
3. Verify inline status dropdown appears on all rows
4. Verify Edit button appears in three-dot menu
5. Verify Cancel option appears in three-dot menu
6. Click Edit - should open request detail page
7. Verify Admin > Roles page is NOT accessible (redirected or hidden)
8. Verify Admin > Users page IS accessible

---

## 3. MANAGER
**Permissions:** `["page:dashboard", "page:all-requests", "page:my-requests", "page:request-detail", "page:shipping", "page:shipping-new", "page:shipping-sending", "page:shipping-receiving", "page:hr", "page:hr-new", "page:maintenance", "page:maintenance-new", "page:purchase", "page:purchase-new", "page:event", "page:travel", "update_status", "cancel_request", "edit_request"]`

### Pages Accessible
- ✅ Dashboard
- ✅ All Requests
- ✅ My Requests
- ✅ Request Detail
- ✅ Shipping (List & New)
- ✅ HR (List & New)
- ✅ Maintenance (List & New)
- ✅ Purchase (List & New)
- ✅ Event
- ✅ Travel
- ❌ Admin > Users (NOT accessible)
- ❌ Admin > Roles (NOT accessible)
- ❌ Admin > Settings (NOT accessible)

### Actions Available
- ✅ Create requests in all modules
- ✅ Update inline status on all module pages
- ✅ Edit requests
- ✅ Cancel requests
- ✅ View activity history
- ✅ Add comments
- ❌ Manage users
- ❌ Manage roles

### Test Steps
1. Log in as Manager user
2. Navigate to Shipping, HR, Maintenance, Purchase, Event, Travel pages
3. Verify inline status dropdown appears
4. Verify Edit button appears in three-dot menu
5. Verify Cancel option appears in three-dot menu
6. Verify Admin sidebar section is hidden or inaccessible

---

## 4. REQUESTER
**Permissions:** `["page:dashboard", "page:my-requests", "page:request-detail", "page:shipping", "page:shipping-receiving", "page:purchase", "page:purchase-new", "page:travel"]`

### Pages Accessible
- ✅ Dashboard
- ✅ My Requests
- ✅ Request Detail
- ✅ Shipping (List only, NOT New)
- ✅ Shipping Receiving
- ✅ Purchase (List & New)
- ✅ Travel
- ❌ All Requests (NOT accessible)
- ❌ HR (NOT accessible)
- ❌ Maintenance (NOT accessible)
- ❌ Shipping New (NOT accessible)
- ❌ Event (NOT accessible)
- ❌ Admin pages (NOT accessible)

### Actions Available
- ❌ Update inline status (Inline status dropdown disabled)
- ❌ Edit requests (Edit button NOT visible)
- ❌ Cancel requests (Cancel option NOT visible)
- ✅ Create requests in: Purchase, Travel
- ✅ View own requests in My Requests
- ✅ View activity/comments

### Test Steps
1. Log in as Requester user
2. Navigate to My Requests - should see own requests
3. Navigate to Shipping page - should see list (no new form)
4. Try to access /shipping/new - should be blocked/redirected
5. Navigate to Purchase - should see both list and new form
6. On any request row, verify:
   - ❌ NO inline status dropdown
   - ❌ NO Edit button in three-dot menu
   - ❌ NO Cancel option in three-dot menu
7. Click "View Details" to expand row
8. Verify request detail has NO status dropdown
9. Verify request detail has NO Edit button

---

## 5. VIEWER
**Permissions:** `["page:dashboard", "page:my-requests", "page:request-detail"]`

### Pages Accessible
- ✅ Dashboard
- ✅ My Requests
- ✅ Request Detail
- ❌ All Requests (NOT accessible)
- ❌ Shipping (NOT accessible)
- ❌ HR (NOT accessible)
- ❌ Maintenance (NOT accessible)
- ❌ Purchase (NOT accessible)
- ❌ Event (NOT accessible)
- ❌ Travel (NOT accessible)
- ❌ Admin pages (NOT accessible)

### Actions Available
- ❌ Create requests (No module pages)
- ❌ Update inline status
- ❌ Edit requests
- ❌ Cancel requests
- ✅ View own requests in My Requests
- ✅ View request details
- ✅ View activity/comments

### Test Steps
1. Log in as Viewer user
2. Dashboard should be accessible
3. My Requests should show only own requests
4. Try to access any module page (Shipping, HR, etc.) - should be blocked
5. Click request detail - should work
6. Verify NO status dropdown, NO Edit button, NO Cancel option on detail page

---

## Full Access Role (Custom Roles Created in UI)

When the "Full Access" or any custom role is created in the Roles management page:

### Expected Behavior
✅ When ALL permissions and page access are checked:
- User should have access to ALL pages
- User should be able to UPDATE status inline on all pages
- User should see Edit button on all pages
- User should see Cancel option on all pages

❌ When any permission is UNCHECKED:
- That specific feature should be hidden from all users with that role
- For example: If "Update Status" is unchecked, inline status dropdowns should be disabled

### Test Custom Role
1. Go to Admin > Roles
2. Create role "Test Role" with:
   - ✅ All permissions checked
   - ✅ All page access checked
3. Assign a user to this role
4. Log in as that user and verify full access
5. Go back and UNCHECK "Update Status" permission
6. Log back in as that user and verify:
   - Status dropdowns are DISABLED
   - Other features still work
7. Repeat for other permissions

---

## Summary Table

| Role | Dashboard | All Requests | My Requests | Module Pages | Update Status | Edit Request | Cancel Request | Admin Access |
|------|:---------:|:------------:|:-----------:|:----------:|:------------:|:------------:|:--------------:|:----------:|
| Super Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ (Users only) |
| Manager | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Requester | ✅ | ❌ | ✅ | ⚠️ (Some) | ❌ | ❌ | ❌ | ❌ |
| Viewer | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Bug Fixes Applied

### 1. Status Update Bug (Full Access Role)
**Issue:** Full Access role couldn't update status inline even though it had all permissions
**Root Cause:** Request detail page was checking for permission "update" but permission was stored as "update_status"
**Fix:** Updated `src/app/(dashboard)/requests/[id]/page.tsx` line 184 to check for "update_status" instead of "update"

### 2. Missing Permission Types
**Issue:** `update_status`, `cancel_request`, and `edit_request` permissions were not recognized in TypeScript
**Fix:** Added these to `RoutePermission` type in `src/lib/access.ts`

### 3. Permission-Based UI Visibility
**Issue:** Edit and Cancel buttons showed regardless of permissions
**Fix:** Made Edit button conditional on `edit_request` permission across all module pages

---

## Notes for Testing
1. After creating or modifying a role in the database, the changes should immediately reflect for all users with that role
2. Permission checks use `hasPermission()` function which handles both specific permissions and wildcard `"*"` permission
3. To test properly, create multiple users and assign them to different roles
4. Clear browser cache if changes don't reflect immediately
