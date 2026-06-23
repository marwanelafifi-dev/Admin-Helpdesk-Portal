# Travel Module — Approval Workflow

## Overview
Travel requests follow the same approval workflow as Purchase and Shipping modules. When a Travel request enters the "Awaiting Approval" status, an email is automatically sent to the Direct Manager with Approve/Reject buttons.

---

## If Approved ✓

### Step 1: Manager Clicks Approve Button
- Email contains an emerald "Approve" button
- Button is a signed, one-time-use link (14-day expiry)
- Token bound to manager's email (prevents forwarding abuse)
- Link format: `/api/requests/{requestId}/approve?token={HMAC_SIGNATURE}`

### Step 2: Server Validates Token
Route: `GET /api/requests/{id}/approve?token=...`

**Validation checks:**
- ✓ Token signature is valid (HMAC-SHA256)
- ✓ Token has not expired (14 days from send time)
- ✓ Token action = "approve"
- ✓ Token manager email = current request's Direct Manager
- ✓ Request exists and is in `awaiting_approval` status

### Step 3: Status Transitions
If all validations pass:
1. Request status: `awaiting_approval` → **`in_progress`** (blue status badge)
2. Last Update Date automatically refreshed
3. New status history entry created: `{ status: "in_progress", timestamp, actor: "Direct Manager" }`

### Step 4: Decision Email Sent
**To:** Manager (the approver)  
**Cc:** Requester + Administration Team + helpdesk + form CC emails + admin CC

**Email content:**
- ✅ **"Request Approved"** header with checkmark icon
- Request details (ID, Title, Type, Direct Manager, Cost Center)
- Travel type badge (Visa or Hotel & Flight)
- All request fields displayed
- Timestamp of approval action
- Confirmation message: "This request has been approved and is now in progress."

### Step 5: In-App Notification
Browser notifications fired immediately (if user has permission `receive_notifications`):
- ✅ Title: `"Travel Request Approved"`
- Message: `"Travel request TRV-2026-XXXX has been approved. Status updated to In Progress."`
- Click notification → navigates to request detail page

### Step 6: Requester Sees Status Change
On the Travel list page `/travel`:
- Status pill changes from amber (Awaiting Approval) to blue (In Progress)
- Last Update Date shows current timestamp
- Inline status select now shows: [new, in_progress, completed, cancelled]
- "Resend Approval Email" button disappears

---

## If Rejected ✗

### Step 1: Manager Clicks Reject Button
- Email contains a red "Reject" button
- Button is a signed, one-time-use link (14-day expiry)
- Token bound to manager's email (prevents forwarding abuse)
- Link format: `/api/requests/{requestId}/reject?token={HMAC_SIGNATURE}`

### Step 2: Rejection Form Displays
Route: `GET /api/requests/{id}/reject?token=...`

**Server validates token** (same as approve flow):
- ✓ Token signature valid
- ✓ Token not expired
- ✓ Token action = "reject"
- ✓ Token manager email = current request's Direct Manager
- ✓ Request exists and is in `awaiting_approval` status

If validation passes, display an HTML form:
```
┌─────────────────────────────────────┐
│  Travel Request Rejection           │
│  Request ID: TRV-2026-XXXX          │
│  Request Title: [title]             │
│                                     │
│  Reason for Rejection (required):   │
│  ┌─────────────────────────────────┐│
│  │ [multi-line textarea]           ││
│  └─────────────────────────────────┘│
│                                     │
│  [Cancel]  [Submit Rejection]       │
└─────────────────────────────────────┘
```

**Required field:** Reason for rejection (min 10 characters, max 2000 characters)

### Step 3: Manager Submits Reason
Route: `POST /api/requests/{id}/reject?token={HMAC_SIGNATURE}`

**Request body:**
```json
{
  "reason": "The dates conflict with another approved travel request..."
}
```

### Step 4: Server Processes Rejection
**Validation:**
- ✓ Token signature, expiry, action type all valid
- ✓ Token manager email matches current Direct Manager
- ✓ Request is in `awaiting_approval` status
- ✓ Reason provided and valid length

**If validation passes:**
1. Request status: `awaiting_approval` → **`cancelled`** (red status badge)
2. Last Update Date automatically refreshed
3. New status history entry created: `{ status: "cancelled", timestamp, actor: "Direct Manager", reason }`
4. Comment added to request thread:
   - Author: "System" or "Direct Manager"
   - Type: Status update
   - Content: `"Rejection reason: {reason_text}"`
   - Timestamp: current time

### Step 5: Decision Email Sent
**To:** Manager (the rejector)  
**Cc:** Requester + Administration Team + helpdesk + form CC emails + admin CC

**Email content:**
- ❌ **"Request Rejected"** header with X icon, red background
- Request details (ID, Title, Type, Direct Manager, Cost Center)
- Travel type badge (Visa or Hotel & Flight)
- Rejection reason quoted
- All request fields displayed
- Timestamp of rejection action
- Note: `"You may reopen this request in the portal if you need to make changes and resubmit."`

### Step 6: In-App Notification
Browser notification fired immediately:
- ❌ Title: `"Travel Request Rejected"`
- Message: `"Travel request TRV-2026-XXXX has been rejected. Status updated to Cancelled."`
- Click notification → navigates to request detail page (shows rejection reason in comments)

### Step 7: Requester Sees Status Change
On the Travel list page `/travel`:
- Status pill changes from amber (Awaiting Approval) to red (Cancelled)
- Last Update Date shows current timestamp
- Comment thread includes rejection reason with timestamp
- Status dropdown now shows: [new, in_progress, completed, cancelled]
- "Resend Approval Email" button disappears

### Step 8: Reopen Option
Requester can optionally:
- Click Edit button on the request row
- Make corrections to form fields
- Resubmit (status → back to `new`)
- Request goes back in the approval queue for the same manager

---

## Token Security Details

### Token Structure
HMAC-SHA256 signed token containing:
```json
{
  "rid": "TRV-2026-0042",
  "act": "approve",    // or "reject"
  "mgr": "manager@example.com",
  "exp": 1719129600    // 14 days from issue time
}
```

### Why Tokens Are Secure
1. **Manager-bound**: Token is signed with the manager's email. If forwarded to someone else, they cannot use it.
2. **One-time use**: Token action is recorded. If someone tries to approve the same token twice, the second call fails (request already in `in_progress`).
3. **Short-lived**: 14-day expiry prevents indefinite re-use window.
4. **HMAC-signed**: Uses `AUTH_SECRET` (never exposed to browser). Cannot be forged without server access.
5. **Action-specific**: Token cannot be repurposed (approve token cannot be used as reject token).

### Token Generation
Called in `POST /api/requests/{id}/send-approval-email`:
```typescript
const approveToken = signApprovalToken(id, "approve", managerEmail)
const rejectToken = signApprovalToken(id, "reject", managerEmail)
```

Source: `src/lib/approvalToken.ts`

---

## Email Template Content

### Manager Email (To: Direct Manager)

**Subject:** `"Visa: Applying For Visa - TRV-2026-0042 approval pending"` (dynamic travel type + title + ID)

**Header:** Teal gradient (#14b8a6 → #0d9488) with headset icon and "Admin Helpdesk Portal" branding

**Body:**

```
Hi [Manager Name],

A travel request requires your approval:

┌──────────────────────────────────────┐
│ Travel Request TRV-2026-0042         │
│ Request Title: Visa Application      │
│ Type: Applying For Visa              │
│ Requester: [Name] ([Email])          │
│ Direct Manager: [Manager Name]       │
│ Cost Center: [Cost Center Name]      │
│                                      │
│ Description: [Markdown-rendered]     │
│                                      │
│ Items Selected: Visa                 │
│ Attachments: 3 files                 │
│  • Visa Document                     │
│  • Aman Sticker                      │
│  • Passport                          │
└──────────────────────────────────────┘

[Emerald APPROVE Button]  [Red REJECT Button]

Both links expire in 14 days.
```

**Footer:** Reply-To address for email responses (optional), Si-Ware logo

### Manager Email (To: CC Recipients)

Same as above, but:
- **Header note**: "You have been copied on this approval request"
- **No action buttons**: "Contact the Direct Manager to provide feedback"

---

## Status Transitions Summary

| Current Status | Action | New Status | Email Sent? |
|---|---|---|---|
| `new` | Request submitted | `new` | ✗ (creation notification only) |
| `new` | Status changed to awaiting_approval | `awaiting_approval` | ✅ Manager approval email |
| `awaiting_approval` | Manager approves | `in_progress` | ✅ Decision notification |
| `awaiting_approval` | Manager rejects | `cancelled` | ✅ Decision notification |
| `in_progress` | Manual status change | `completed` | ✗ (status-change notification only) |
| `in_progress` | Manual status change | `cancelled` | ✗ (status-change notification only) |
| `cancelled` | Requester reopens + resubmits | `new` | ✗ (edit/resubmit) |

---

## Manager Email Delivery

### Who Receives the Approval Email?

**To:** Direct Manager email (resolved from Company Data → Managers list)

**Cc (all recipients get the decision notification):**
- Requester email
- All Administration Team members (full access)
- `adminhelpdesk@si-ware.com` (helpdesk/support)
- Form-provided CC emails (requester typed addresses)
- Admin CC list (from company-data.json)

**De-duplication:** If manager is also the requester, they appear only once in To: field

### Manager Email Resolution

The system looks up the manager's email in this order:
1. Stored in request payload: `payload.directManager` (Travel/HR/Purchase format — string name)
2. Company Data Managers list: `getList("managers")` — resolves name to email
3. Fall-through: If manager not found, error returned ("No email on file for manager 'X'")

### SMTP Configuration

- **Pooled connection**: One persistent connection per configured SMTP endpoint
- **Rate limiting**: 1 message per 2 seconds (prevents Gmail throttling)
- **Retry logic**: 3 attempts with exponential backoff (2s, 4s, 6s for throttle errors)
- **Timeout protection**: 15s connection + greeting, 60s socket timeout

---

## Example Flow

### Scenario: Visa Application Approval

**Timeline:**
1. **10:00 AM** — Requester submits "Applying For Visa" request on Travel form
   - Status: `new`
   - Request ID: `TRV-2026-0042`
   - Direct Manager: "Ahmed Hassan"

2. **10:05 AM** — Admin updates status to `awaiting_approval`
   - Auto-triggers approval email send
   - Manager "Ahmed Hassan" receives email with Approve/Reject buttons
   - Cc: requester + all Admin Team members + helpdesk

3. **11:30 AM** — Manager Ahmed clicks "Approve" button in email
   - Browser navigates to `/api/requests/TRV-2026-0042/approve?token=...`
   - Server validates token (signature, expiry, manager email)
   - Status updated to `in_progress`
   - Decision email sent to Ahmed + all CC recipients
   - In-app notification: "✅ Travel Request Approved"

4. **11:35 AM** — Requester checks Travel list
   - Request TRV-2026-0042 now shows blue "In Progress" status
   - Last Update Date: "23 Jun 2026 — 11:30 AM"
   - Can now proceed with visa application steps

---

## Error Handling

### If Approval Link Fails

**Reasons:**
- Token expired (> 14 days old)
- Token signature invalid (tampered or corrupt)
- Manager email changed (manager reassignment)
- Request already processed (duplicate click)
- Request not found (deleted)

**Response:**
- Page displays error message: "This approval link is no longer valid."
- Suggestion: "Contact the requester or admin to resend the approval email."

### If Rejection Form Submission Fails

**Reasons:**
- Reason field empty or too short (< 10 chars)
- Token validation failed (same as approve)
- Request status already changed (concurrent edit)

**Response:**
- Form validation error displayed inline
- User can correct and resubmit
- If token issue, error page with message to contact admin

---

## Resend Approval Email

### When Available
Travel requests in `awaiting_approval` status show a "Resend Approval Email" button on:
- Travel list page (inline button on each row)
- Request detail page (card action button)

### What It Does
`POST /api/requests/{id}/send-approval-email`
- Resolves manager email fresh (in case it changed)
- Generates new tokens (old tokens may have expired)
- Sends same email template as original
- Updates timestamp on approval email (not request timestamps)

### Use Cases
- Original email went to spam
- Manager didn't receive it (mail server issue)
- Manager lost the original email
- Need to remind manager after some time has passed

---

## Auditing & Tracking

### Audit Log Entries
- **approval_email_sent**: `requestId`, manager email, send timestamp
- **approval_email_resent**: `requestId`, manager email, resend timestamp, reason (if provided via UI)
- **request_approved**: `requestId`, status change, actor: "Direct Manager", timestamp
- **request_rejected**: `requestId`, status change, actor: "Direct Manager", rejection reason, timestamp
- **request_commented**: On rejection, system comment created with rejection reason

### Activity History
Request detail page shows chronological timeline:
- ✅ Status changed to Awaiting Approval (timestamp)
- ✅ Approval email sent to Ahmed Hassan (timestamp)
- ✅ Approved by Direct Manager (timestamp)
- ✅ Status changed to In Progress (timestamp)

---

**Status**: ✅ PRODUCTION READY  
**Last Updated**: 23 Jun 2026  
**Tested**: Approval and rejection workflows fully functional with email delivery
