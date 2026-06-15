# UI Features - Permission Requirements

This document maps each UI feature to the permission required to display/enable it.

---

## Module Pages (All)

### Module List Page (e.g., `/shipping`, `/hr`, `/purchase`, etc.)

| Feature | Required Permission | Component | File |
|---------|-------------------|-----------|------|
| Page Access | `page:{module}` | Route guard | Next.js routing |
| Inline Status Dropdown | `update_status` | `InlineStatusSelect` | `src/components/ui/InlineStatusSelect.tsx` |
| Edit Button (three-dot menu) | `edit_request` | `RequestActionsMenu` | `src/components/ui/RequestActionsMenu.tsx` |
| Cancel Option (three-dot menu) | `cancel_request` | `RequestActionsMenu` | `src/components/ui/RequestActionsMenu.tsx` |
| View Details Button (expand) | None | `RequestActionsMenu` | Always available |
| Add New Request Button | `page:{module}-new` | Button/Link | Module page header |

### Module New/Edit Form Page (e.g., `/shipping/new`, `/hr/new`, etc.)

| Feature | Required Permission | Notes |
|---------|-------------------|-------|
| Page Access | `page:{module}-new` | Route guard |
| Form Display | None | Form always shows if page is accessible |
| Submit Button | None | Always enabled if form is valid |
| File Upload | None | Always enabled |
| View Source Module | Only when opening from edit link | Uses `source` query param |

---

## Request Detail Page (`/requests/[id]`)

| Feature | Required Permission | Component/Location |
|---------|-------------------|-------------------|
| Page Access | `page:request-detail` | Route guard |
| Status Dropdown | `update_status` | Status button with chevron |
| Edit Button | `edit_request` | Header button next to status |
| Status Change Action | `update_status` | handleStatusChange() function |
| Activity Tab | `activity` | Tab visibility |
| Comments Tab | None | Always visible |
| Attachments Tab | None | Always visible |

**Location:** `src/app/(dashboard)/requests/[id]/page.tsx`

### Code References

**Status Dropdown Condition (Line 184):**
```typescript
const canChangeStatus = session?.user?.permissions && hasPermission(session.user.permissions, "update_status")
```

**Edit Button Condition (Line 187):**
```typescript
const canEditRequest = session?.user?.permissions && hasPermission(session.user.permissions, "edit_request")
```

**Edit Button JSX (Lines 479-485):**
```tsx
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

---

## Dashboard Page (`/dashboard`)

| Feature | Required Permission | Notes |
|---------|-------------------|-------|
| Page Access | `page:dashboard` | Always accessible by most roles |
| Stat Cards | None | Display counts based on user's accessible data |
| Charts | None | Display data based on user's accessible data |
| Activity Stream | None | Shows user's own activities |

---

## Admin Pages

### All Requests Page (`/admin/all-requests`)

| Feature | Required Permission |
|---------|-------------------|
| Page Access | `page:all-requests` |
| Inline Status Dropdown | `update_status` |
| Edit Button | `edit_request` |
| Cancel Option | `cancel_request` |

**File:** `src/app/(dashboard)/admin/all-requests/page.tsx`

### Users Management Page (`/admin/users`)

| Feature | Required Permission |
|---------|-------------------|
| Page Access | `page:admin-users` |
| Create User | `manage_users` |
| Edit User | `manage_users` |
| Delete User | `manage_users` |

### Roles Management Page (`/admin/roles`)

| Feature | Required Permission |
|---------|-------------------|
| Page Access | `page:admin-roles` |
| Create Role | `manage_roles` |
| Edit Role | `manage_roles` |
| Delete Role | `manage_roles` |
| Modify Permissions | `manage_roles` |

### Settings Page (`/admin/settings`)

| Feature | Required Permission |
|---------|-------------------|
| Page Access | `page:admin-settings` |
| Modify Settings | `settings` |

---

## Feature Implementation Checklist

### How to Add Permission Check to New Feature

1. **Identify Required Permission**
   - Create: `update_status`, `cancel_request`, `edit_request`
   - Manage: `manage_users`, `manage_roles`
   - Settings: `settings`
   - Read: Usually associated with page access

2. **Add Permission Check in Component**
   ```typescript
   const canDoAction = session?.user?.permissions && 
     hasPermission(session.user.permissions, "permission_name")
   ```

3. **Make Feature Conditional**
   ```typescript
   {canDoAction && (
     <Button onClick={handleAction}>
       Action
     </Button>
   )}
   ```

4. **Disable Instead of Hide (Optional)**
   ```typescript
   <Button 
     disabled={!canDoAction}
     title={canDoAction ? "Click to act" : "You don't have permission"}
   >
     Action
   </Button>
   ```

---

## Permission Checking Pattern

### Using `hasPermission()` Utility

**File:** `src/lib/access.ts`

```typescript
export function hasPermission(permissions: string[] | undefined, permission: string) {
  if (!permissions || permissions.length === 0) {
    return false
  }
  // Check for wildcard or exact permission match
  return permissions.includes("*") || permissions.includes(permission)
}
```

### Usage Pattern

```typescript
// In component
import { hasPermission } from "@/lib/access"

const MyComponent = () => {
  const { data: session } = useSession()
  
  // Check permission
  const canEdit = session?.user?.permissions && 
    hasPermission(session.user.permissions, "edit_request")
  
  // Use in JSX
  return (
    <>
      {canEdit && <EditButton />}
      {canEdit ? <EnabledFeature /> : <DisabledFeature />}
    </>
  )
}
```

---

## Module List Page Pattern

All module pages follow this pattern:

```typescript
export default function ModulePage() {
  const { data: session } = useSession()
  
  // Permission checks
  const canUpdateStatus = 
    (session?.user?.permissions as string[])?.includes("update_status") ?? false
  const canEditRequest = 
    (session?.user?.permissions as string[])?.includes("edit_request") ?? false
  const canCancelRequest = 
    (session?.user?.permissions as string[])?.includes("cancel_request") ?? false
  
  return (
    <>
      {/* Table */}
      <table>
        <tbody>
          {requests.map(req => (
            <tr key={req.id}>
              {/* ... */}
              
              {/* Status Column */}
              <td>
                <InlineStatusSelect
                  onStatusChange={handleStatusChange}
                  canUpdateStatus={canUpdateStatus}
                />
              </td>
              
              {/* Actions Column */}
              <td>
                <RequestActionsMenu
                  onEdit={canEditRequest ? handleEdit : undefined}
                  showCancelOption={canCancelRequest}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
```

**Files using this pattern:**
- `src/app/(dashboard)/shipping/page.tsx`
- `src/app/(dashboard)/hr/page.tsx`
- `src/app/(dashboard)/maintenance/page.tsx`
- `src/app/(dashboard)/purchase/page.tsx`
- `src/app/(dashboard)/event/page.tsx`
- `src/app/(dashboard)/travel/page.tsx`
- `src/app/(dashboard)/shipping/receiving/page.tsx`
- `src/app/(dashboard)/admin/all-requests/page.tsx`

---

## Testing Permissions

### Manual Testing Checklist

1. **Create test users with each role**
2. **For each role, verify:**
   - Pages are accessible/blocked correctly
   - Features show/hide based on permissions
   - Actions work/are disabled based on permissions
3. **Modify a role permission**
   - Uncheck a permission in Admin > Roles
   - Log in as user with that role
   - Verify feature is hidden
4. **Test wildcard permission**
   - Create Super Admin user
   - Verify all features available

### Automated Testing (Future)

```typescript
// Example test
describe('Permission System', () => {
  it('should hide edit button when edit_request permission is missing', () => {
    const permissions = ['page:shipping', 'update_status']
    const canEdit = hasPermission(permissions, 'edit_request')
    expect(canEdit).toBe(false)
  })
  
  it('should show edit button when edit_request permission exists', () => {
    const permissions = ['page:shipping', 'edit_request']
    const canEdit = hasPermission(permissions, 'edit_request')
    expect(canEdit).toBe(true)
  })
  
  it('should grant all permissions with wildcard', () => {
    const permissions = ['*']
    expect(hasPermission(permissions, 'edit_request')).toBe(true)
    expect(hasPermission(permissions, 'update_status')).toBe(true)
    expect(hasPermission(permissions, 'any_permission')).toBe(true)
  })
})
```

---

## Troubleshooting

### Feature Appears When It Shouldn't

**Cause:** Permission check is missing
**Solution:** Add conditional rendering with `canDoAction` check

### Permission Doesn't Update After Role Change

**Cause:** Session not refreshed, or database change not saved
**Solution:** 
- Clear browser cache
- Log out and back in
- Verify role change was saved in database

### "You don't have permission" on Page You Should Access

**Cause:** Role doesn't have required `page:*` permission
**Solution:**
- Check role definition in database or `DEFAULT_ROLE_PERMISSIONS`
- Add required permission to role
- Log out and back in

### Inline Status Not Updating

**Cause:** Missing `update_status` permission
**Solution:**
- Verify user's role has `update_status` permission
- Check that `canUpdateStatus` variable is true in component
- Clear browser cache and refresh

---

## Quick Reference

### Super Admin
- Permissions: `["*"]`
- Result: ALL features visible and enabled

### Admin
- Missing: `manage_roles`, `page:admin-roles`
- Result: Cannot access Roles page, cannot manage roles

### Manager
- Missing: All `page:admin-*`, `manage_users`
- Result: Cannot access Admin area

### Requester
- Missing: `update_status`, `edit_request`, `cancel_request`, most pages
- Result: Cannot modify requests, limited page access

### Viewer
- Missing: Everything except dashboard and my-requests
- Result: Read-only, cannot create or modify anything

