# Shipping Module — Awaiting Approval Status Implementation

## Overview
Added the **"Awaiting Approval"** workflow status to the Shipping module, mirroring the Purchase module's approval workflow.

## Changes Made

### 1. Schema Update
**File:** `src/modules/shipping/shipping.schema.ts`
- Updated `REQUEST_STATUSES` to include `awaiting_approval`:
  ```
  "new", "awaiting_approval", "in_progress", "in_customs", "delivered", "cancelled"
  ```

### 2. Shipping Page (`/shipping`)
**File:** `src/app/(dashboard)/shipping/page.tsx`
- Updated `STATUSES` constant to include `awaiting_approval`
- Added status label: `awaiting_approval: "Awaiting Approval"`
- Added status color: `awaiting_approval: "bg-amber-500 border-amber-500 text-white"` (amber for visibility)
- Added stat card: "Awaiting Approval" with count and icon
- Updated stats calculation: `awaitingApproval` count filter

### 3. Shipping Sending Page (`/shipping/sending`)
**File:** `src/app/(dashboard)/shipping/sending/page.tsx`
- Same updates as Shipping page for consistency
- Status list, labels, colors, and stat cards all updated

### 4. Shipping Receiving Page (`/shipping/receiving`)
**File:** `src/app/(dashboard)/shipping/receiving/page.tsx`
- Same updates as Shipping page for consistency
- Status list, labels, colors, and stat cards all updated

### 5. My Requests Page (`/requests`)
**File:** `src/app/(dashboard)/requests/page.tsx`
- Updated `MODULE_STATUSES["shipping"]` to include `awaiting_approval`:
  ```
  ["new", "awaiting_approval", "in_progress", "in_customs", "delivered", "cancelled"]
  ```
- Updated `MODULE_STATUS_LABELS["shipping"]` to include awaiting approval label
- Users can now transition shipping requests to/from awaiting_approval status inline

### 6. All Requests Page (`/admin/all-requests`)
**File:** `src/app/(dashboard)/admin/all-requests/page.tsx`
- Updated `MODULE_STATUSES["shipping"]` with awaiting_approval
- Updated `MODULE_STATUS_LABELS["shipping"]` with awaiting approval label
- Admins can manage awaiting_approval status from the all-requests view

## Status Workflow for Shipping

**Before:**
```
New → In Progress → In Customs → Delivered → Completed
                              ↘ Cancelled
```

**After:**
```
New → Awaiting Approval → In Progress → In Customs → Delivered → Completed
   ↘                                                            ↗
    ────────────────────── Cancelled ────────────────────
```

## Color Scheme
- **Awaiting Approval**: Amber/Amber-500 (matches Purchase module)
  - Active state: `bg-amber-500 border-amber-500 text-white`
  - Icon color: Amber-600 in status badges

## Integration Notes

### Stat Cards
Each Shipping page now displays 6 stat cards:
1. Total Shipments (dark slate)
2. New (sky blue)
3. **Awaiting Approval (amber)** ← NEW
4. In Progress (blue)
5. In Customs (amber-600)
6. Delivered (green)

### Inline Status Editing
Users with `update_status` permission can click the status badge on any shipping row and select "Awaiting Approval" from the dropdown.

### Email Workflow Integration
⚠️ **Note:** The "Awaiting Approval" status is currently **not** integrated with the shipping approval email workflow yet. The Purchase module sends approval emails automatically when entering `awaiting_approval`. To fully replicate this for Shipping:
- Add conditional logic in `updateStatus()` to detect shipping + awaiting_approval
- Trigger approval email sending (requires manager email resolution)
- Accept one-click Approve/Reject links in emails

This can be implemented in a follow-up phase if needed.

## Testing Checklist

- [ ] Navigate to `/shipping` and verify "Awaiting Approval" stat card appears with count
- [ ] Navigate to `/shipping/sending` and `/shipping/receiving` — same stat card visible
- [ ] Create a new shipping request
- [ ] Click the Status badge and verify "Awaiting Approval" appears in the dropdown
- [ ] Select "Awaiting Approval" and verify:
  - Status changes to "Awaiting Approval"
  - Count in stat card increments
  - Last Update Date refreshes
- [ ] Transition from "Awaiting Approval" to "In Progress" — verify dropdown works
- [ ] On `/requests` (My Requests) inline edit the status
- [ ] On `/admin/all-requests` verify admin can set shipping status to "Awaiting Approval"
- [ ] Verify status persists after page reload

## Files Modified (6 Total)

1. ✓ `src/modules/shipping/shipping.schema.ts` — Schema definition
2. ✓ `src/app/(dashboard)/shipping/page.tsx` — Shipping list page
3. ✓ `src/app/(dashboard)/shipping/sending/page.tsx` — Sending submodule
4. ✓ `src/app/(dashboard)/shipping/receiving/page.tsx` — Receiving submodule
5. ✓ `src/app/(dashboard)/requests/page.tsx` — My Requests page
6. ✓ `src/app/(dashboard)/admin/all-requests/page.tsx` — Admin All Requests page

## Related Purchase Module
For reference, Purchase module already has the complete awaiting_approval workflow:
- Status transitions: `new` → `awaiting_approval` → `in_progress`
- Automatic approval email sent with one-click links
- Approval tokens with signature verification
- Resend approval email action in UI

## Future Enhancements

1. **Approval Email Workflow**: Implement automatic approval emails for awaiting_approval status
2. **Approval Token System**: Add signed tokens for one-click Approve/Reject
3. **Manager Notifications**: Email Direct Manager when shipment enters awaiting_approval
4. **Approval Dashboard**: Special view for managers showing only awaiting_approval shipments
5. **Audit Trail**: Track who approved/rejected and when
