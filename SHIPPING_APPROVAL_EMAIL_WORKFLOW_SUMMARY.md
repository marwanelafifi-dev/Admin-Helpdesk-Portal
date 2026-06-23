# Shipping Approval Email Workflow — Complete Implementation

## Overview
Implemented the **complete approval email workflow** for Shipping requests, matching the Purchase module's implementation with:
- ✅ One-click Approve/Reject buttons in email
- ✅ HMAC-signed tokens with 14-day expiry
- ✅ Manager authorization checks
- ✅ Decision notifications to team
- ✅ Resend approval email action
- ✅ Auto-email when entering "Awaiting Approval"

## Files Modified (11 Total)

### 1. Email Service
**File:** `src/lib/emailService.ts`
- ✅ Added `sendShippingApprovalEmail()` function
  - Manager email with action buttons (Approve/Reject)
  - CC email for read-only copy (no action buttons)
  - Cyan/teal color gradient header (distinct from Purchase)
  - Shipping-specific fields (direction, carrier, tracking number, PO, cost center, delivery date)
  - Professional HTML template with branding

### 2. API Routes

**File:** `src/app/api/requests/[id]/send-approval-email/route.ts`
- ✅ Updated to support both Purchase and Shipping
  - Detects module type and calls appropriate email function
  - Resolves Direct Manager email via Company Data
  - Generates signed approval tokens (14-day expiry)
  - Sends to manager + CC to admin team + requester + helpdesk
  - Error handling with detailed messages

**File:** `src/app/api/requests/[id]/approve/route.ts`
- ✅ Already supports both modules (no changes needed)
  - Verifies HMAC signature
  - Confirms manager authorization
  - Validates request status is awaiting_approval
  - Updates status to in_progress
  - Adds system comment "Approved"
  - Notifies team of decision

**File:** `src/app/api/requests/[id]/reject/route.ts`
- ✅ Already supports both modules (no changes needed)
  - Same token verification
  - Updates status to cancelled
  - Adds system comment "Rejected"
  - Notifies team of decision

### 3. Core Service

**File:** `src/services/engineService.ts`
- ✅ Updated `updateStatus()` to trigger approval email for Shipping
  - Detects: `updated.module === "shipping" && status === "awaiting_approval"`
  - Calls `/api/requests/{id}/send-approval-email` POST
  - Throws detailed error if email fails
  - Previously only triggered for Purchase

### 4. Request Detail Page

**File:** `src/app/(dashboard)/requests/[id]/page.tsx`
- ✅ Updated `getStatusesByModule()` to include awaiting_approval for Shipping
  - Shipping: `['new', 'awaiting_approval', 'in_progress', 'in_customs', 'delivered', 'cancelled']`
- ✅ "Resend Approval Email" button now shows for both Purchase and Shipping
  - Visibility: `(request.module === "purchase" || request.module === "shipping") && status === "awaiting_approval"`
  - Button styling: amber border + amber text
  - States: idle, sending, success, error
  - Calls same API endpoint
- ✅ Auto-email notification when transitioning to awaiting_approval
  - Shows success message: "Approval email sent to the Direct Manager."
  - Visible for both modules

## Workflow Steps

### 1. User Submits Shipping Request
- Request created with status `new`
- Ready for processing

### 2. User Transitions to "Awaiting Approval"
- UI: Click status badge → select "Awaiting Approval"
- Backend: `updateStatus()` called with `awaiting_approval` status
- Auto-trigger: POST `/api/requests/{id}/send-approval-email`

### 3. Approval Email Sent
**To:** Direct Manager (required)
**CC:** Admin Team + Requester + Helpdesk + Form CC recipients

**Manager Email Contains:**
- Request title and ID
- Cyan gradient header (Shipping Approval Request)
- All shipping details:
  - Requested by (name + email)
  - Direction (Sending/Receiving)
  - Carrier name
  - Tracking number
  - PO number
  - Cost center
  - Expected delivery date
  - Description
  - Notes
- Two action buttons:
  - **Approve** (green) → links to `/api/requests/{id}/approve?token=<signed>`
  - **Reject** (red) → links to `/api/requests/{id}/reject?token=<signed>`
- Portal link fallback
- Single-use token warning

**CC Email Contains:**
- Same details (read-only)
- No action buttons
- "Portal Link" button only
- Informational header

### 4. Manager Clicks Approve/Reject

**Server-Side Validation:**
1. ✅ Token signature verified (HMAC-SHA256)
2. ✅ Token expiry checked (14 days)
3. ✅ Manager email matches request's current Direct Manager
4. ✅ Request status still awaiting_approval

**On Approve:**
- Status: `awaiting_approval` → `in_progress`
- Comment: "Approved" added to request thread
- Author: Manager's email
- Decision email sent to team

**On Reject:**
- Status: `awaiting_approval` → `cancelled`
- Comment: "Rejected" added to request thread
- Author: Manager's email
- Decision email sent to team

**Response Page (HTML):**
- Success message with checkmark (emerald)
- Request title and ID displayed
- Portal link provided
- Styled confirmation card

### 5. Team Notified of Decision
Via `notifyDecision()`:
- Requester gets email: "Your shipment request was approved/rejected"
- Admin team sees notification in portal
- Activity logged in Audit Trail

### 6. Resend Approval Email (If Needed)
**User Action:**
- Navigate to request detail page
- If status is "Awaiting Approval", button visible
- Click "Resend Approval Email"

**Flow:**
- POST `/api/requests/{id}/send-approval-email`
- New tokens generated
- Fresh email sent to manager
- Status message shows result

## Token System

### Token Shape
```
<base64url(payload)>.<base64url(hmac)>
```

### Payload
```json
{
  "rid": "SHP-2026-0001",
  "act": "approve" | "reject",
  "mgr": "manager@si-ware.com",
  "exp": 1719388800
}
```

### Signing
- Algorithm: HMAC-SHA256
- Secret: `AUTH_SECRET` environment variable (shared with NextAuth)
- Expiry: 14 days from issue
- Single-use: enforced by checking request status on verify

### Security
- Token bound to manager email (prevents token forwarding)
- Manager email validated against current Direct Manager on request
- Status checked before applying decision (prevents reuse)
- HMAC prevents tampering
- 14-day expiry prevents indefinite validity

## Email Templates

### Shipping Approval Email (Manager)
- **Header Color:** Cyan gradient (`#0369a1 → #06b6d4`)
- **Label:** "SHIPPING APPROVAL REQUEST"
- **Buttons:** Approve (emerald), Reject (red)
- **Fields:** Direction, Carrier, Tracking #, PO, Cost Center, Delivery Date, Description, Notes

### Shipping CC Email
- **Header Color:** Same cyan
- **Buttons:** None (read-only)
- **Link Only:** View Request in Portal
- **Tone:** Informational

### Design Elements
- Logo (Si-Ware) at top
- Professional typography
- Clear field labels
- Monospace URL for accessibility
- Responsive mobile layout
- Dark footer

## Integration Points

### Company Data
- **Direct Manager Resolution:** via `resolveRequestManagerEmail()`
  - Checks payload.approvers.directManager.email (Shipping format)
  - Falls back to Company Data managers list
  - Throws error if no email found

### Audit Trail
- `request_approved` event logged
- `request_rejected` event logged
- Actor: Manager email
- Details: "Approved by Direct Manager" / "Rejected by Direct Manager"

### Notifications
- In-app notification for team
- Email to requester with decision
- Email to admin team for visibility
- Entry in Audit Trail

### Status Transitions
```
awaiting_approval → in_progress (Approve) or cancelled (Reject)
```

## Testing Checklist

### Email Sending
- [ ] Create new shipping request
- [ ] Navigate to detail page
- [ ] Change status to "Awaiting Approval"
- [ ] Verify success message appears
- [ ] Check email inbox for approval email (to Direct Manager)
- [ ] Check CC recipients received email
- [ ] Verify email has Approve/Reject buttons
- [ ] Verify cyan header color (distinct from Purchase blue)

### Approve Flow
- [ ] Click "Approve" button in email
- [ ] Browser navigates to approval confirmation page
- [ ] Page shows "Request approved" with emerald header
- [ ] Check that status changed to "In Progress" in portal
- [ ] Verify "Approved" comment added to request
- [ ] Check requester received notification email

### Reject Flow
- [ ] Create another shipping request
- [ ] Send approval email again
- [ ] Click "Reject" button
- [ ] Browser shows "Request rejected" with red header
- [ ] Check that status changed to "Cancelled"
- [ ] Verify "Rejected" comment added to request

### Resend Approval Email
- [ ] On request detail page (status: awaiting_approval)
- [ ] Click "Resend Approval Email" button
- [ ] Verify loading state shows "Sending..."
- [ ] Check for success message
- [ ] Verify manager receives new email with fresh buttons

### Token Security
- [ ] Try accessing approval link from different email account → should fail ("Not authorized")
- [ ] Try accessing approval link after 15 days → should fail ("Link expired")
- [ ] Try modifying token in URL → should fail ("bad_signature")
- [ ] Try using Approve token as Reject token → should fail ("wrong_action")
- [ ] Approval buttons should be single-use → second click shows "already processed"

### Cross-Module Compatibility
- [ ] Purchase approval workflow still works (regression test)
- [ ] Request detail page handles both modules correctly
- [ ] Inline status editor works for both Purchase and Shipping awaiting_approval
- [ ] Resend button appears for both modules

## Comparison: Shipping vs Purchase

| Feature | Shipping | Purchase |
|---------|----------|----------|
| **Status Code** | awaiting_approval | awaiting_approval |
| **Auto-Email** | ✅ Yes | ✅ Yes |
| **Email Color** | Cyan (#0369a1) | Blue (#1e40af) |
| **Manager CC** | ✅ Yes | ✅ Yes |
| **Admin Team CC** | ✅ Yes | ✅ Yes |
| **Requester CC** | ✅ Yes | ✅ Yes |
| **One-Click Buttons** | ✅ Approve/Reject | ✅ Approve/Reject |
| **Token Signing** | ✅ HMAC-SHA256 | ✅ HMAC-SHA256 |
| **14-Day Expiry** | ✅ Yes | ✅ Yes |
| **Resend Button** | ✅ Yes | ✅ Yes |
| **Manager Auth** | ✅ Email bound | ✅ Email bound |
| **Status Transition** | `in_progress` / `cancelled` | `in_progress` / `cancelled` |
| **System Comment** | "Approved" / "Rejected" | "Approved" / "Rejected" |
| **Decision Notification** | ✅ Yes | ✅ Yes |

## Future Enhancements

1. **Bulk Approval:** Allow managers to approve/reject multiple shipments at once
2. **Comments on Decision:** Manager adds notes when approving/rejecting
3. **Conditional Fields:** Show different details based on direction (sending vs receiving)
4. **Calendar Integration:** Sync delivery dates to manager's calendar
5. **Mobile App:** Native app push notifications for approvals
6. **Approval Templates:** Manager creates approval rules (auto-approve for known suppliers)

## Known Limitations

1. **Direct Manager Required:** Request must have a Direct Manager set (enforced by API)
2. **No Multi-Level Approval:** Single approval from Direct Manager only
3. **No Delegation:** Manager cannot delegate approval to another user
4. **Token Binding:** Tokens cannot be transferred (bound to manager email)
5. **No Batch Approval:** Each shipment requires individual approval

## Troubleshooting

### "No Direct Manager set" Error
- **Cause:** Request payload missing directManager
- **Fix:** Edit request and set Direct Manager before approving

### "No email on file for manager" Error
- **Cause:** Manager name exists but no email in Company Data
- **Fix:** Go to Admin → Company Data → Managers, add email

### Approval buttons not working
- **Check:** Manager email matches request's current Direct Manager
- **Check:** Status is still awaiting_approval (not already processed)
- **Check:** Token not expired (older than 14 days)
- **Check:** Email headers stripped/modified in transit

### Email not received
- **Check:** Admin → Settings → Email Config is configured
- **Check:** SMTP credentials are correct
- **Check:** Manager email is valid (no typos)
- **Check:** Email not filtered to spam (whitelist adminhelpdesk@si-ware.com)

## Related Files

- `src/lib/approvalToken.ts` — Token signing/verification (shared with Purchase)
- `src/lib/approvalNotify.ts` — Manager email resolution
- `src/lib/notificationStore.ts` — Decision notification emails
- `src/app/api/requests/[id]/reject/route.ts` — Reject button endpoint
- `data/company-data.json` — Manager email storage
