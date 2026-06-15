# Notifications System

## Overview
A role-based notification system that sends notifications for:
- **Status changes** — when request status updates
- **Pending approvals** — when requests need manager/admin approval
- **Comments** — when someone comments on a request

## Components Created

### 1. Notification Service (`src/services/notificationService.ts`)
Core service handling all notification logic:

```ts
// Get user's notifications
const notifications = getNotifications(userId)

// Get unread count
const count = getUnreadCount(userId)

// Mark as read
markAsRead(notificationId)

// Create notifications
notifyStatusChange(userId, requestId, requestTitle, module, newStatus)
notifyPendingApproval(userId, requestId, requestTitle, module, requesterName)
notifyNewComment(userId, requestId, requestTitle, module, commenterName, preview)
```

### 2. Notification Center Component (`src/components/ui/NotificationCenter.tsx`)
Dropdown notification center with:
- List of recent notifications
- Unread badge count
- Mark as read / Mark all as read
- Delete notification
- Link to notification settings
- Relative time formatting

Usage:
```tsx
<NotificationCenter userId={userId} />
```

### 3. Notification Settings Page (`src/app/(dashboard)/notifications/page.tsx`)
User preference page to control:
- Status change notifications
- Pending approval notifications (role-based)
- Comment notifications
- Email notification toggle
- Shows user's role with description

## Integration Steps

### Step 1: Add notification calls when status changes
In each module page's `handleStatusChange`:

```ts
import { notifyStatusChange } from "@/services/notificationService"

async function handleStatusChange(id: string, newStatus: string) {
  setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus, updatedAt: new Date().toISOString() } : r))
  updateStatus(id, newStatus as RequestStatus, "USR-001")
  
  // Notify relevant users
  notifyStatusChange("USR-002", id, req.title, "hr", newStatus)
}
```

### Step 2: Add notification calls when comments are created
In the comment creation handler:

```ts
import { notifyNewComment } from "@/services/notificationService"

function handleCreateComment(content: string) {
  // ... save comment ...
  notifyNewComment(req.requesterId, req.id, req.title, req.module, "Current User", content)
}
```

### Step 3: Add notification call for pending approvals
When a new request is submitted that needs approval:

```ts
import { notifyPendingApproval } from "@/services/notificationService"

function handleSubmitRequest(payload) {
  // ... create request ...
  // Notify managers/admins
  notifyPendingApproval("MANAGER-001", req.id, req.title, req.module, req.requesterName)
}
```

### Step 4: Add NotificationCenter to TopBar
Update `src/components/layout/TopBar.tsx`:

```tsx
import { NotificationCenter } from "@/components/ui/NotificationCenter"

export function TopBar() {
  const { data: session } = useSession()
  
  return (
    // ... existing code ...
    <NotificationCenter userId={session?.user?.id || "USR-001"} />
    // ... rest of TopBar ...
  )
}
```

### Step 5: Add Notifications link to Sidebar
Update `src/components/layout/Sidebar.tsx` to include:

```tsx
{ id: "notifications", label: "Notifications", icon: Bell, href: "/notifications" }
```

## Role-Based Behavior

| Role | Status Changes | Pending Approvals | Comments |
|------|---------------|-------------------|----------|
| Super Admin | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ✅ |
| Manager | ✅ | ✅ | ✅ |
| Requester | ✅ | ❌ | ✅ |
| Viewer | ✅ | ❌ | ✅ |

## Notification Preferences
Users can control preferences at `/notifications`:
- Toggle notification types on/off
- Enable/disable email notifications
- Settings persist in localStorage

## Storage
All data stored in localStorage:
- `arp_notifications` — notification list
- `arp_notification_preferences` — user preferences per role

## Email Integration (Mock)
Currently simulates email sending via `sendEmailNotification()`.
In production, replace with real email service (SendGrid, AWS SES, etc.)

## Future Enhancements
- [ ] Real email service integration
- [ ] Notification sound/desktop alerts
- [ ] Notification grouping/aggregation
- [ ] Notification scheduling (quiet hours)
- [ ] Notification templates
- [ ] Digest emails
