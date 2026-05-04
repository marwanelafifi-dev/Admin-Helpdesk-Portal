# Complete Testing Guide - Permission System

## Quick Start Testing

### 1. Test Full Access Role (The Bug Fix)
**Issue Fixed:** Full Access role couldn't update status inline
**Status:** ✅ FIXED

**Test Steps:**
1. Go to Admin > Roles
2. Select "Full Access" role
3. Verify ALL permissions are checked
4. Assign a test user to this role
5. Log in as that user
6. Go to any module page (Shipping, HR, etc.)
7. **VERIFY:** Status dropdown works on each row
8. **VERIFY:** Can change status by clicking dropdown
9. **VERIFY:** Edit button appears in three-dot menu
10. **VERIFY:** Cancel option appears in three-dot menu

---

### 2. Test Super Admin Role
**Expected:** All features available

**Test Steps:**
1. Log in as Super Admin
2. Navigate to Shipping page
   - ✅ Verify status dropdown appears
   - ✅ Verify Edit button appears
   - ✅ Verify Cancel option appears
   - ✅ Try changing status
   - ✅ Try clicking Edit
3. Navigate to All Requests page
   - ✅ Verify same features work
4. Navigate to Admin > Roles
   - ✅ Verify page loads
   - ✅ Verify can edit role permissions
5. Open any request detail page
   - ✅ Verify status dropdown works
   - ✅ Verify Edit button appears
   - ✅ Verify Activity tab shows

---

### 3. Test Admin Role
**Expected:** All features except role management

**Test Steps:**
1. Log in as Admin
2. Module pages (Shipping, HR, Purchase, Maintenance, Event, Travel)
   - ✅ All pages accessible
   - ✅ Status dropdown works
   - ✅ Edit button visible
   - ✅ Cancel option visible
3. Admin > Users
   - ✅ Page accessible
   - ✅ Can manage users
4. Admin > Roles
   - ❌ Page should NOT be accessible
   - Navigate to /admin/roles
   - Should be redirected or see "Not Authorized"
5. Request detail pages
   - ✅ Status dropdown works
   - ✅ Edit button visible

---

### 4. Test Manager Role
**Expected:** All module features, no admin access

**Test Steps:**
1. Log in as Manager
2. Module pages
   - ✅ All pages (Shipping, HR, Purchase, Maintenance, Event, Travel) accessible
   - ✅ Status dropdown works
   - ✅ Edit button visible
   - ✅ Cancel option visible
3. Admin area
   - ❌ No Admin link in sidebar
   - Try navigating to /admin/users
   - Should be redirected to first allowed page
   - Try navigating to /admin/roles
   - Should be redirected

---

### 5. Test Requester Role
**Expected:** Limited pages, no edit/update/cancel features

**Test Steps:**
1. Log in as Requester
2. My Requests page
   - ✅ Page accessible
   - Shows own requests
   - ❌ NO status dropdown
   - ❌ NO Edit button
   - ❌ NO Cancel option
3. Shipping page
   - ✅ Page accessible (list only)
   - ❌ NO status dropdown
   - ❌ NO Edit button
   - ❌ NO Cancel option
4. Try accessing Shipping/New
   - ✅ Page accessible
   - Can create new shipping request
5. Try accessing HR page
   - ❌ Should be inaccessible (not in Requester permissions)
   - Navigate to /hr
   - Should be redirected
6. Try accessing Maintenance page
   - ❌ Should be inaccessible
7. Request detail page
   - ✅ Can see request details
   - ❌ NO status dropdown
   - ❌ NO Edit button

---

### 6. Test Viewer Role
**Expected:** Dashboard and My Requests only, read-only

**Test Steps:**
1. Log in as Viewer
2. Dashboard
   - ✅ Page accessible
3. My Requests
   - ✅ Page accessible
   - Shows own requests
   - ❌ NO status dropdown
   - ❌ NO Edit button
   - ❌ NO Cancel option
4. Try accessing Shipping page
   - ❌ Should NOT be accessible
   - Navigate to /shipping
   - Should be redirected to Dashboard or My Requests
5. Try accessing HR page
   - ❌ Should NOT be accessible
6. Request detail page
   - ✅ Can see request details
   - ❌ NO status dropdown
   - ❌ NO Edit button

---

## Permission Modification Testing

### Test: Unchecking a Permission

**Setup:**
1. Create a custom role called "Test Role"
2. Check ALL permissions and pages
3. Assign a user to this role

**Test Unchecking "Update Status":**
1. Log in as user with "Test Role"
2. Go to Shipping page
3. **VERIFY:** Status dropdown works
4. Go back to Admin > Roles
5. Edit "Test Role"
6. **UNCHECK** "Update Status" permission
7. Save role changes
8. Log out and back in
9. Go to Shipping page
10. **VERIFY:** Status dropdown is now disabled/hidden
11. **VERIFY:** Edit button still works
12. **VERIFY:** Cancel option still works

**Test Unchecking "Edit Request":**
1. Same role, same user
2. Go to Admin > Roles
3. Edit "Test Role"
4. **CHECK** "Update Status" again (re-enable it)
5. **UNCHECK** "Edit Request" permission
6. Save changes
7. Log out and back in
8. Go to Shipping page
9. **VERIFY:** Status dropdown works
10. **VERIFY:** Edit button is now hidden
11. **VERIFY:** Cancel option still works

**Test Unchecking "Cancel Request":**
1. Same process
2. **UNCHECK** "Cancel Request"
3. **VERIFY:** Cancel option is hidden
4. **VERIFY:** Status dropdown and Edit button still work

---

## Module-Specific Testing

### Shipping Module
**Files:** 
- `src/app/(dashboard)/shipping/page.tsx`
- `src/app/(dashboard)/shipping/new/page.tsx`
- `src/modules/shipping/ShippingForm.tsx`

**Test:**
1. Admin/Manager/Super Admin can edit requests
2. Requester can create but not edit (except own)
3. Viewer cannot access

### HR Module
**Files:**
- `src/app/(dashboard)/hr/page.tsx`
- `src/app/(dashboard)/hr/new/page.tsx`
- `src/modules/hr/HRForm.tsx`

**Test:**
1. Navigate to HR page
2. Check onboarding/offboarding tab filtering
3. Verify inline status works for admin/manager
4. Verify edit button works for admin/manager
5. Verify not accessible to requester/viewer

### Maintenance Module
**Test:** Same as HR

### Purchase Module
**Test:** Same as HR

### Event Module
**Test:** Same as HR

### Travel Module
**Test:** Same as HR

---

## Admin Pages Testing

### Admin > Users
**Test:**
1. Admin can access
2. Manager CANNOT access
3. Can create new users
4. Can edit user roles
5. Can delete users (with confirmation)

### Admin > Roles
**Test:**
1. Super Admin can access
2. Admin CANNOT access
3. Can create new roles
4. Can modify role permissions
5. Changes immediately affect users with that role
6. Cannot delete built-in roles (super_admin, admin, manager, requester, viewer)

### Admin > Settings
**Test:**
1. Admin can access
2. Manager CANNOT access
3. Can modify settings
4. Settings persist on refresh

---

## Database Persistence Testing

### Test: Role Changes Persist
1. Log in as Admin
2. Go to Admin > Roles
3. Create new role "Test Persist"
4. Add some permissions
5. Save
6. Close tab
7. Open app in new tab
8. Go to Admin > Roles
9. **VERIFY:** "Test Persist" role still exists
10. **VERIFY:** Permissions are still selected

### Test: User Role Assignment Persists
1. Create user "TestUser"
2. Assign to "Test Persist" role
3. Log out
4. Log in as TestUser
5. **VERIFY:** TestUser has correct permissions
6. Modify TestUser's role to different one
7. Log out and back in
8. **VERIFY:** New role permissions apply

### Test: Permission Changes Affect All Users
1. Create custom role "Shared Role"
2. Assign 3 users to this role
3. Log in as first user
4. Go to Shipping
5. **VERIFY:** Status dropdown works
6. Switch to Admin account
7. Go to Admin > Roles
8. Edit "Shared Role"
9. **UNCHECK** "Update Status"
10. Log out
11. Log in as second user
12. Go to Shipping
13. **VERIFY:** Status dropdown is disabled
14. Log in as third user
15. Go to Shipping
16. **VERIFY:** Status dropdown is disabled
17. **Conclusion:** All users with same role have same permissions

---

## Edge Cases Testing

### Test: Wildcard Permission
1. Create role with only `["*"]` permission
2. Assign user to this role
3. User should have ALL features available
4. This is what Super Admin gets by default

### Test: Empty Permissions Array
1. Create role with no permissions checked
2. Assign user to this role
3. User should only see Dashboard (if they have that)
4. Most pages should be inaccessible
5. No edit/status/cancel features

### Test: Missing Permission String
1. Create role with only `"page:shipping"`
2. Assign user to this role
3. User can see Shipping page
4. User CANNOT update status
5. User CANNOT edit requests
6. User CANNOT cancel requests

### Test: Session Refresh
1. Log in as Admin
2. Go to Admin > Roles
3. Admin modifies own role (Admin role)
4. **UNCHECK** "Update Status"
5. Admin refreshes current page
6. Navigate to Shipping page
7. **VERIFY:** Status dropdown is now disabled
8. **Conclusion:** Changes take effect after page refresh

---

## Performance Testing (Optional)

### Test: Permission Checks Don't Slow Down
1. Go to Shipping page with 100+ requests
2. Page should load quickly
3. Inline status dropdowns should respond quickly to clicks
4. No noticeable lag in permission checks

### Test: Role With Many Permissions
1. Create role with 50+ permissions checked
2. Assign user to this role
3. Verify no slowdown in permission checking

---

## Cross-Browser Testing

### Browsers to Test
- Chrome (Latest)
- Firefox (Latest)
- Safari (Latest)
- Edge (Latest)

### Test in Each Browser
1. Log in with different roles
2. Verify all permissions work
3. Verify dropdowns/buttons work correctly
4. Verify styling consistent

---

## Accessibility Testing

### Test Keyboard Navigation
1. Tab through module list pages
2. Verify all buttons accessible via keyboard
3. Status dropdown should open/close with keyboard
4. Edit/Cancel options accessible via keyboard

### Test Screen Readers
1. Test with NVDA or JAWS
2. Permission-hidden features should not be announced
3. Disabled buttons should announce as disabled

---

## Final Checklist

- [ ] Super Admin can do everything
- [ ] Admin cannot manage roles
- [ ] Manager cannot access admin area
- [ ] Requester cannot edit/update/cancel
- [ ] Viewer can only read
- [ ] Permission changes immediately affect users
- [ ] All module pages respect permissions
- [ ] Request detail page respects permissions
- [ ] Status dropdown disabled without permission
- [ ] Edit button hidden without permission
- [ ] Cancel option hidden without permission
- [ ] Custom roles persist in database
- [ ] User role assignments persist
- [ ] All changes take effect after refresh
- [ ] No performance issues with permission checks
- [ ] Works across all browsers
- [ ] Keyboard accessible
- [ ] Screen reader friendly

---

## Known Issues & Workarounds

### Issue: Changes Don't Show Immediately
**Workaround:** Refresh page or log out/back in

### Issue: Permission String Typo
**Check:** Role permissions exactly match permission names in code
- `update_status` (not `updateStatus` or `update`)
- `edit_request` (not `editRequest`)
- `cancel_request` (not `cancelRequest`)

### Issue: Super Admin Can't See Custom Role Page
**Reason:** Super Admin bypass all checks, use Admin to test role pages

---

## Support

For issues during testing:
1. Check browser console for errors
2. Verify role is saved in database
3. Verify user is assigned to correct role
4. Clear browser cache
5. Try different browser
6. Check git status for uncommitted changes
