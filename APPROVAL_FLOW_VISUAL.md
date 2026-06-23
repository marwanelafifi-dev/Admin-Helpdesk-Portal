# Travel Module Approval Flow — Visual Summary

## Approval Path ✅

```
┌─────────────────────────────────────────────────────────────┐
│ Requester Submits Travel Request                           │
│ Status: NEW (sky badge)                                     │
│ Travel Type: Visa OR Hotel & Flight                         │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Admin Updates Status → AWAITING APPROVAL (amber badge)     │
│ Trigger: updateStatus("awaiting_approval")                  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
        🔐 APPROVAL EMAIL SENT
┌─────────────────────────────────────────────────────────────┐
│ To: Direct Manager email                                   │
│ Cc: Requester, Admin Team, Helpdesk, Form CC, Admin CC     │
│                                                             │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ Subject: {Type}: {Title} - {ID} approval pending      │  │
│ │ Header: Teal Gradient (#14b8a6 → #0d9488)           │  │
│ │                                                       │  │
│ │ Travel Request TRV-2026-XXXX                          │  │
│ │ Type: Applying For Visa / Hotel & Flight             │  │
│ │ Direct Manager: [Manager]                             │  │
│ │ Cost Center: [Center]                                 │  │
│ │                                                       │  │
│ │ Items: [List]                                         │  │
│ │ Attachments: [Count]                                  │  │
│ │                                                       │  │
│ │ [Emerald APPROVE]    [Red REJECT]                     │  │
│ │ (both 14-day signed tokens, manager-bound)            │  │
│ └───────────────────────────────────────────────────────┘  │
└────────────────┬─────────────────────────────────────────┬──┘
                 │                                         │
         ✅ APPROVE                            ❌ REJECT
                 │                                         │
                 ▼                                         ▼
┌──────────────────────────────────────┐  ┌──────────────────────────┐
│ Manager Clicks APPROVE Button         │  │ Manager Clicks REJECT    │
│ GET /api/requests/TRV-2026-XXXX/     │  │ GET /api/requests/TRV... │
│     approve?token=...                │  │     reject?token=...     │
│ Token Validation:                     │  │ Token Validation:        │
│  ✓ Signature valid                    │  │  ✓ Signature valid       │
│  ✓ Not expired (14 days)              │  │  ✓ Not expired (14 days) │
│  ✓ Action = approve                   │  │  ✓ Action = reject       │
│  ✓ Manager email matches              │  │  ✓ Manager email matches │
│  ✓ Request in awaiting_approval       │  │  ✓ Request in awaiting.. │
└──────────────────────────────────────┘  │                          │
         │                                 └─────────────┬────────────┘
         │                                              │
         │                           Displays Rejection Form:
         │                           ┌──────────────────────┐
         │                           │ Reason Required:     │
         │                           │ ┌──────────────────┐ │
         │                           │ │ [textarea]       │ │
         │                           │ └──────────────────┘ │
         │                           │ [Cancel] [Submit]    │
         │                           └──────────────────────┘
         │                                     │
         │                                     ▼
         │                           POST /api/requests/...
         │                               /reject?token=...
         │                           { reason: "..." }
         │                                     │
         │      ┌──────────────────────────────┘
         │      │
         ▼      ▼
    Update Status & Send Decision Email
┌────────────────────────────────────────────┐
│ Status: awaiting_approval → in_progress   │
│ (or awaiting_approval → cancelled)         │
│                                            │
│ Last Update Date: NOW                      │
│ Status History Entry: Added               │
│ Comment: Added (rejection reason if reject)│
│                                            │
│ 📧 Decision Email Sent:                   │
│   To: Manager (approver/rejector)         │
│   Cc: All recipients (same as approval)   │
│   Subject: "Request Approved" or          │
│           "Request Rejected"              │
│   Content: Full request + decision time   │
└────────────────────────────────────────────┘
         │
         ▼
    IN-APP NOTIFICATION
┌────────────────────────────────────────────┐
│ ✅ "Travel Request Approved" or            │
│ ❌ "Travel Request Rejected"               │
│                                            │
│ [Click to view request]                    │
└────────────────────────────────────────────┘
         │
         ▼
  REQUESTER SEES CHANGE
┌────────────────────────────────────────────┐
│ Travel list page auto-updates:             │
│                                            │
│ If Approved:                               │
│  • Status badge: amber → BLUE              │
│  • Status: "In Progress"                   │
│  • Can now change to: completed/cancelled  │
│                                            │
│ If Rejected:                               │
│  • Status badge: amber → RED               │
│  • Status: "Cancelled"                     │
│  • Comments show rejection reason          │
│  • Can edit + resubmit to new status       │
│                                            │
│ Last Update: Shows approval/rejection time │
└────────────────────────────────────────────┘
```

---

## Quick Status Reference

| Status | Color | Badge | Means |
|--------|-------|-------|-------|
| `new` | Sky | ⚪ | Submitted, not yet reviewed |
| `awaiting_approval` | Amber | 🟡 | Awaiting manager decision |
| `in_progress` | Blue | 🔵 | Approved, being processed |
| `completed` | Emerald | 🟢 | Done and closed |
| `cancelled` | Red | 🔴 | Rejected or user-cancelled |

---

## Email Buttons

### Approve Button
```
┌──────────────────────────────┐
│    ✅ APPROVE REQUEST        │
└──────────────────────────────┘

Clicking opens: /api/requests/{id}/approve?token={HMAC}
- Validates manager email in token
- Updates status to in_progress
- Sends decision email to all recipients
- Cannot be clicked twice (status already changed)
```

### Reject Button
```
┌──────────────────────────────┐
│    ❌ REJECT REQUEST         │
└──────────────────────────────┘

Clicking opens: /api/requests/{id}/reject?token={HMAC}
- Validates manager email in token
- Shows form asking for rejection reason
- Form submission:
  * Validates reason (min 10 chars)
  * Updates status to cancelled
  * Adds comment with reason
  * Sends decision email to all recipients
```

---

## Token Security

```
Token Format (HMAC-SHA256):
┌─────────────────────────────────────┐
│ {                                   │
│   "rid": "TRV-2026-0042",          │
│   "act": "approve|reject",         │
│   "mgr": "manager@example.com",    │
│   "exp": 1719129600                │
│ }                                   │
│ Signed with AUTH_SECRET             │
└─────────────────────────────────────┘

Security Properties:
✓ HMAC-SHA256 signed (cannot forge)
✓ Manager-bound (cannot forward)
✓ 14-day expiry (time-limited)
✓ Action-specific (approve ≠ reject)
✓ One-time use (status prevents reuse)
```

---

## Email Recipients

### Approval Email Structure

```
┌────────────────────────────────────────┐
│  TO: Direct Manager (primary)          │
│      manager@company.com               │
│                                        │
│  CC: (all receivers of decision too)   │
│      ├─ requester@company.com          │
│      ├─ admin1@company.com             │
│      ├─ admin2@company.com             │
│      ├─ adminhelpdesk@si-ware.com      │
│      ├─ form-cc-1@company.com          │
│      └─ form-cc-2@company.com          │
│                                        │
│  Deduplication: case-insensitive,      │
│  manager excluded from CC if same addr │
└────────────────────────────────────────┘
```

---

## Timeline Example

```
10:00 AM  │ Requester submits Travel request
          │ ID: TRV-2026-0042, Status: NEW
          │
10:05 AM  │ Admin clicks "Update Status"
          │ Changes to: AWAITING APPROVAL
          │ ✉️ Email sent to manager Ahmed Hassan
          │
11:30 AM  │ Manager Ahmed receives & reviews email
          │ Clicks [✅ APPROVE] button
          │
11:30:05  │ Server validates token:
          │ ✓ Signature OK
          │ ✓ Not expired
          │ ✓ Manager email matches
          │ ✓ Request in awaiting_approval
          │
11:30:10  │ Status updated: awaiting_approval → in_progress
          │ Comment added: "Approved by Direct Manager"
          │ ✉️ Decision email sent to all recipients
          │
11:30:15  │ Browser notification: "Request Approved ✅"
          │ Requester clicks → view request detail
          │
11:31 AM  │ Requester checks Travel list
          │ Request shows BLUE "In Progress" status
          │ Can now proceed with travel planning
```

---

## Failure Scenarios

### If Manager Clicks Approve Twice
```
1st Click:  ✅ Status updated to in_progress
            ✅ Decision email sent
            ✅ Returns success page

2nd Click:  ❌ Request not in awaiting_approval anymore
            ❌ Token validation fails
            ❌ Error: "This approval link is no longer valid"
```

### If Approval Link Expires
```
After 14 days: ❌ Token signature expires
               ❌ Link becomes invalid
               
Solution: Requester asks admin to
          "Resend Approval Email" button
          → generates new token
          → email sent again
```

### If Manager Email Changes
```
Manager reassigned to different email:
❌ Old token bound to old email
❌ New email in request updated
❌ Link validation fails: "Token manager email doesn't match"

Solution: Approval email must be resent
          (generates token with new manager email)
```

---

## Dark Mode Support

All emails and portal pages fully support dark mode:

```
Light Mode:
┌─────────────────────────┐
│ Teal Header (#14b8a6)   │
│ White Card Background   │
│ Dark Text (#1f2937)     │
│ Blue Approve Button     │
│ Red Reject Button       │
└─────────────────────────┘

Dark Mode:
┌─────────────────────────┐
│ Teal Header (#14b8a6)   │
│ Dark Card (#1e293b)     │
│ Light Text (#f1f5f9)    │
│ Blue Approve Button     │
│ Red Reject Button       │
└─────────────────────────┘
```

Email clients support teal branding in both modes.

---

## Resend Approval Email

Available when request is in `awaiting_approval` status:

```
Travel List Page:
┌─────────────┐
│ Request Row │ [⋯ Menu]  → "Resend Approval Email"
└─────────────┘              ↓
                    POST /api/requests/.../send-approval-email
                             ↓
                    ✓ Resolve manager email fresh
                    ✓ Generate new tokens (old may expire)
                    ✓ Send same email template
                             ↓
                    Success message:
                    "Approval email resent to Manager Name"
```

---

**Created**: 23 Jun 2026  
**Status**: ✅ Ready for Production  
**Tested**: All approval and rejection flows working end-to-end
