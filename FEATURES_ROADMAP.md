# Advanced Features Implementation Roadmap

## Overview
4 critical features for all modules:
1. **Audit Trail** - Track all changes to requests
2. **Comments** - Discussion threads on requests
3. **Notifications** - Real-time alerts for status/comment updates
4. **Google OAuth** - Si-Ware domain authentication + multi-email support

---

## Feature 1: Audit Trail (All Modules)

### 1.1 Database Schema

```prisma
model RequestHistory {
  id          String   @id @default(cuid())
  requestId   String
  request     Request  @relation(fields: [requestId], references: [id], onDelete: Cascade)
  
  // Action type
  action      String   // "created", "status_changed", "comment_added", "approved", "rejected", "assigned", "field_updated"
  
  // What changed
  fieldName   String?  // null for "created", "status" for status change, etc.
  oldValue    Json?    // Previous value
  newValue    Json?    // New value
  
  // Who made the change
  changedByUserId String
  changedByUser   User     @relation("HistoryChangedBy", fields: [changedByUserId], references: [id])
  
  // Metadata
  metadata    Json?    // Additional context (e.g., reason for rejection)
  createdAt   DateTime @default(now())
  
  @@index([requestId])
  @@index([createdAt])
  @@index([action])
}
```

### 1.2 API Endpoints

```typescript
// GET /api/requests/:module/:id/history
// Returns: Array of RequestHistory with user details
// Query params: ?limit=50&offset=0&action=status_changed

// Internal: createHistoryEntry(requestId, action, changes, userId)
// Called automatically when:
// - Request created
// - Status changes
// - Comment added
// - Approval/rejection
// - Assignment changed
// - Any field updated
```

### 1.3 Frontend Implementation

**Dashboard/Module Pages:**
- Add "Activity" tab showing audit trail
- Display timeline of changes with user avatars
- Filter by action type (Status changes, Approvals, Comments, etc.)
- Show old vs new values for field changes

**Timeline UI:**
```
[Avatar] Marwan Elafifi changed Status from "New" to "In Progress"
         May 29, 2026 at 3:45 PM
         
[Avatar] Ahmed Hassan approved the request as Direct Manager
         May 28, 2026 at 2:15 PM
         
[Avatar] Sarah Mohamed created the request
         May 27, 2026 at 10:30 AM
```

### 1.4 Implementation Steps

- [ ] Create `RequestHistory` table in Prisma schema
- [ ] Add database indices for requestId, createdAt, action
- [ ] Create `historyService.ts` with helper function:
  ```typescript
  async function recordChange(
    requestId: string,
    action: string,
    fieldName: string | null,
    oldValue: any,
    newValue: any,
    userId: string,
    metadata?: any
  )
  ```
- [ ] Call `recordChange()` on every request mutation
- [ ] Create GET endpoint: `/api/requests/:module/:id/history`
- [ ] Add "Activity" tab to request detail page
- [ ] Display timeline with filters

---

## Feature 2: Comments (All Modules)

### 2.1 Database Schema

```prisma
model Comment {
  id          String   @id @default(cuid())
  requestId   String
  request     Request  @relation(fields: [requestId], references: [id], onDelete: Cascade)
  
  // Comment content
  content     String   // Markdown support
  
  // Who commented
  authorId    String
  author      User     @relation(fields: [authorId], references: [id])
  
  // Edit tracking
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  editedAt    DateTime? // null if never edited
  
  // Mentions/tags
  mentions    String[] // Array of userId mentions
  
  // Attachments support
  attachments CommentAttachment[]
  
  // Nested replies (optional for Phase 1)
  parentCommentId String?
  parentComment   Comment? @relation("Replies", fields: [parentCommentId], references: [id], onDelete: Cascade)
  replies         Comment[] @relation("Replies")
  
  @@index([requestId])
  @@index([createdAt])
}

model CommentAttachment {
  id        String   @id @default(cuid())
  commentId String
  comment   Comment  @relation(fields: [commentId], references: [id], onDelete: Cascade)
  
  name      String
  url       String
  mimeType  String
  sizeBytes Int
  
  uploadedAt DateTime @default(now())
  
  @@index([commentId])
}
```

### 2.2 API Endpoints

```typescript
// GET /api/requests/:module/:id/comments
// Returns: Array of comments with author details + attachments
// Query params: ?limit=20&offset=0&sort=newest

// POST /api/requests/:module/:id/comments
// Body: { content: string, mentions: string[], attachments: File[] }
// Returns: Created comment + triggers notification
// Note: Form data multipart/form-data for file upload

// PATCH /api/requests/:module/:id/comments/:commentId
// Body: { content: string, attachments: File[] }
// Returns: Updated comment

// DELETE /api/requests/:module/:id/comments/:commentId
// Returns: Success status

// DELETE /api/requests/:module/:id/comments/:commentId/attachments/:attachmentId
// Returns: Attachment deleted
```

### 2.3 Frontend Implementation

**Comment Section (Below Request Details):**
```
┌─────────────────────────────────────────────────────────┐
│  COMMENTS & DISCUSSION                                   │
└─────────────────────────────────────────────────────────┘

[Avatar] Marwan Elafifi
         05-29-2026 at 3:45 PM
         
         "The shipment is ready for dispatch. Please confirm 
          the delivery address with @Ahmed Hassan"
         
         📎 invoice_2026.pdf (2.4 MB)
         📎 awb_tracking.pdf (1.1 MB)
         
         Edit  Delete  Reply
         
  └─ [Avatar] Ahmed Hassan
     05-29-2026 at 4:10 PM
     
     "Confirmed. Delivery address is 123 Main St, Cairo"
     
     Edit  Delete

┌─────────────────────────────────────────────────────────┐
│  Add Comment                                             │
├─────────────────────────────────────────────────────────┤
│ [Avatar] [Your Name]                                     │
│                                                          │
│ [Text area - type message or @mention]                  │
│                                                          │
│ [Attach Files] [Submit Button]                          │
│ Attached: invoice.pdf (2.4 MB) ✕                        │
└─────────────────────────────────────────────────────────┘
```

**Styling Notes:**
- Comment box: `bg-white border border-gray-200 rounded-lg p-4 mb-3`
- Author name: `font-semibold text-gray-900 text-sm`
- Timestamp: `text-gray-500 text-xs font-normal`
- Comment text: `text-gray-700 text-sm leading-relaxed mt-2`
- Attachment icon: `📎` + gray-600 link with file size
- Action buttons: `text-xs font-medium text-gray-500 hover:text-blue-600`
- Mention highlight: `text-blue-600 font-medium`

### 2.4 Implementation Steps

- [ ] Create `Comment` + `CommentAttachment` tables in Prisma schema
- [ ] Set up file upload storage (S3, local filesystem, or cloud)
- [ ] Create comment service:
  ```typescript
  async function createComment(requestId, authorId, content, mentions, attachments)
  async function updateComment(commentId, content, attachments)
  async function deleteComment(commentId)
  async function deleteAttachment(attachmentId)
  async function getComments(requestId, limit, offset)
  ```
- [ ] Create API endpoints with multipart/form-data support
- [ ] Build comment UI component:
  - [ ] Textarea for comment content
  - [ ] File upload zone (drag & drop)
  - [ ] Attachment list with remove button
  - [ ] Submit button
  - [ ] Edit and delete buttons
- [ ] Add mention autocomplete (@username) with user dropdown
- [ ] Format comments with proper styling (font size, spacing, colors)
- [ ] Implement notifications for mentions (see Feature 3)
- [ ] Add comments section to request detail view

### 2.5 Mention System

```typescript
// Auto-detect mentions in comment: @username
// On submit, extract mentions and:
// 1. Parse @mentions from content
// 2. Validate users exist
// 3. Store in mentions array
// 4. Send notifications to mentioned users
// 5. Replace @username with link in display

// Display mentions as: @Ahmed Hassan (clickable user profile)
```

---

## Feature 3: Notifications (All Modules)

### 3.1 Database Schema

```prisma
model Notification {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Notification content
  type        String   // "status_change", "comment_added", "mentioned", "approval_needed", "request_created"
  title       String   // "Status Changed: New → In Progress"
  description String   // Detailed message
  
  // Related data
  requestId   String?  // null for system notifications
  request     Request? @relation(fields: [requestId], references: [id], onDelete: SetNull)
  
  commentId   String?  // null if not comment-related
  comment     Comment? @relation(fields: [commentId], references: [id], onDelete: SetNull)
  
  // Status
  read        Boolean  @default(false)
  readAt      DateTime?
  actionUrl   String?  // e.g., "/shipping/receiving/SHP-001"
  
  // Channels
  emailSent   Boolean  @default(false)
  inApp       Boolean  @default(true)
  
  createdAt   DateTime @default(now())
  
  @@index([userId])
  @@index([read])
  @@index([createdAt])
}

model NotificationPreference {
  id          String   @id @default(cuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Email preferences
  emailOnStatusChange Boolean @default(true)
  emailOnComment      Boolean @default(true)
  emailOnMention      Boolean @default(true)
  emailOnApproval     Boolean @default(true)
  
  // Batch email
  emailFrequency      String  @default("immediate") // "immediate", "daily", "weekly"
  
  // Do not disturb
  dndEnabled          Boolean @default(false)
  dndStartTime        String? // "18:00"
  dndEndTime          String? // "09:00"
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### 3.2 Notification Triggers

**Status Change Notification:**
```typescript
When: Status changes (e.g., New → In Progress)
Send to: Requester, Assignee, all Approvers, CC emails
Title: "Status Changed: New → In Progress"
Description: "[Request Title] status was updated by [User Name]"
```

**Comment Notification:**
```typescript
When: New comment added
Send to: Requester, Assignee, all previous commenters, CC emails
Title: "New Comment: [First 50 chars of comment]"
Description: "[User Name] commented on your request"
Skip: Comment author (they know they commented)
```

**Mention Notification:**
```typescript
When: User is mentioned in comment
Send to: Mentioned users only
Title: "You were mentioned in a comment"
Description: "[User Name] mentioned you: [comment preview]"
```

**Approval Needed:**
```typescript
When: Request reaches approval stage
Send to: Direct Manager, Tech Manager, PM (role-based)
Title: "Approval Needed"
Description: "[Request Title] is awaiting your approval"
```

### 3.3 Notification Service Architecture

```typescript
// src/services/notificationService.ts

// Main trigger function
async function notifyOnStatusChange(
  requestId: string,
  oldStatus: string,
  newStatus: string,
  changedByUserId: string,
  request: Request
)

// Recipient calculation
async function getNotificationRecipients(requestId: string, notificationType: string) {
  // Returns: {
  //   requester: User,
  //   assignees: User[],
  //   approvers: User[],
  //   ccEmails: string[],
  //   mentioned: User[]
  // }
}

// Create notification entry
async function createNotification(
  userId: string,
  type: string,
  title: string,
  description: string,
  requestId: string,
  actionUrl: string
)

// Send email notification
async function sendEmailNotification(
  user: User,
  notification: Notification
)

// Respect preferences
async function shouldNotifyUser(userId: string, notificationType: string)
```

### 3.4 Email Service Setup

**Email Provider:** SendGrid / AWS SES / Mailgun

**Email Template (Status Change):**
```
Subject: [Admin Portal] Status Update: [Request Title]

Dear [User Name],

The status of your request "[Request Title]" has been updated.

Status Changed: [Old Status] → [New Status]
Updated by: [User Name]
Updated at: [Date/Time]

[Request Details]
Request ID: SHP-2026-0001
Module: Shipping
Requester: [Name]
Created: [Date]

[Action Button] View Request

---
[Footer]
This is an automated notification from Admin Request Platform
```

### 3.5 Frontend Implementation

**Notification Bell (Top Right):**
- [ ] Show badge with unread count
- [ ] Click to open notification drawer (max 10 visible)
- [ ] "View all" link to full notification page
- [ ] Mark as read on hover
- [ ] Quick actions (view request, dismiss)

**Notification Preferences Page:**
- [ ] `/settings/notifications`
- [ ] Email toggle for each notification type
- [ ] Email frequency (immediate / daily / weekly)
- [ ] Do Not Disturb settings
- [ ] Unsubscribe from all

**Notification Center Page:**
- [ ] `/notifications`
- [ ] List all notifications (with pagination)
- [ ] Filter by type (Status, Comments, Mentions, etc.)
- [ ] Filter by read status
- [ ] Bulk mark as read
- [ ] Delete notification

### 3.6 Implementation Steps

- [ ] Create `Notification` and `NotificationPreference` tables
- [ ] Set up email service (SendGrid/SES)
- [ ] Create `notificationService.ts` with trigger functions
- [ ] Implement notification creation on:
  - [ ] Request creation
  - [ ] Status change
  - [ ] Approval/Rejection
  - [ ] Comment added
  - [ ] User mentioned
- [ ] Create API endpoints:
  - [ ] GET `/api/notifications` (list)
  - [ ] PATCH `/api/notifications/:id` (mark as read)
  - [ ] GET `/api/notifications/preferences` (get)
  - [ ] PATCH `/api/notifications/preferences` (update)
- [ ] Build notification UI components
- [ ] Add notification bell to header
- [ ] Create settings page for preferences
- [ ] Test email delivery
- [ ] Implement DND logic

---

## Feature 4: Google OAuth (All Users)

### 4.1 Architecture Overview

**Flow:**
```
User clicks "Sign in with Google"
    ↓
NextAuth.js handles OAuth flow
    ↓
Verify user is @si-ware.com domain
    ↓
Create/Update user in database
    ↓
Set session + JWT token
    ↓
Redirect to dashboard
```

### 4.2 Database Schema Updates

```prisma
model User {
  id            String    @id @default(cuid())
  
  // Basic info
  name          String
  email         String    @unique
  
  // OAuth
  googleId      String?   @unique
  picture       String?   // Google avatar URL
  
  // Authorization
  role          String    // "super_admin", "admin", "manager", "requester", "viewer"
  department    String?
  
  // Status
  emailVerified DateTime?
  active        Boolean   @default(true)
  
  // Multi-email support
  additionalEmails String[] // ["user2@company.com", "user3@external.com"]
  
  // Relations
  requests      Request[]
  comments      Comment[]
  approvals     Approval[]
  history       RequestHistory[]
  notifications Notification[]
  preferences   NotificationPreference?
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@index([email])
  @@index([role])
}

// Track user sessions
model Session {
  id            String   @id @default(cuid())
  sessionToken  String   @unique
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expires       DateTime
  
  @@index([userId])
}
```

### 4.3 NextAuth.js Setup

**Installation:**
```bash
npm install next-auth @auth/prisma-adapter
```

**Configuration File: `src/auth/config.ts`**
```typescript
import { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  
  callbacks: {
    // Verify Si-Ware domain or allowed external emails
    async signIn({ user, profile }) {
      const email = user.email || profile?.email || "";
      
      // Check if Si-Ware domain
      if (email.endsWith("@si-ware.com")) {
        return true;
      }
      
      // Check if email explicitly allowed
      const dbUser = await prisma.user.findUnique({
        where: { email },
      });
      
      if (dbUser?.additionalEmails?.includes(email)) {
        return true;
      }
      
      return false; // Reject sign in
    },
    
    // Add user data to JWT
    async jwt({ token, user, profile }) {
      if (user) {
        token.userId = user.id;
        token.role = user.role;
      }
      return token;
    },
    
    // Add token data to session
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
    signOut: "/auth/signout",
  },
  
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
};

export default authConfig;
```

### 4.4 Authentication Routes

**Sign In Page: `src/app/auth/signin/page.tsx`**
```typescript
// Display "Sign in with Google" button
// Show message: "Sign in with your Si-Ware account (@si-ware.com)"
// Custom error handling for domain verification failures
```

**Sign Out Page: `src/app/auth/signout/page.tsx`**
```typescript
// Confirm sign out
// Clear session + JWT
// Redirect to sign in
```

**Error Page: `src/app/auth/error/page.tsx`**
```typescript
// Show error message for:
// - Domain verification failed
// - Email not allowed
// - Session expired
```

### 4.5 Multi-Email Support

**Admin Feature: Add User to Additional Emails**

```typescript
// PUT /api/admin/users/:userId/emails
// Body: { email: "user@external.com" }
// Action: Add to additionalEmails array

// Allows:
// 1. Primary email: marwan@si-ware.com (OAuth)
// 2. Additional emails: marwan@external.com, consulting@client.com
// 3. All emails can be used to create/assign requests
```

**User Profile Page:**
```typescript
// Show primary email (from Google)
// List additional allowed emails
// Button to request new email addition
// Admin can approve/reject requests
```

### 4.6 Middleware Protection

**File: `src/middleware.ts`**
```typescript
export function middleware(request: NextRequest) {
  const session = request.cookies.get("next-auth.session-token");
  
  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith("/shipping") ||
      request.nextUrl.pathname.startsWith("/hr") ||
      request.nextUrl.pathname.startsWith("/admin")) {
    
    if (!session) {
      return NextResponse.redirect(new URL("/auth/signin", request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

### 4.7 Environment Variables

**`.env.local`**
```bash
# Google OAuth
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret

# NextAuth
NEXTAUTH_URL=http://localhost:3003
NEXTAUTH_SECRET=your_secret_key_here

# Database
DATABASE_URL=postgresql://...
```

### 4.8 Google Cloud Setup

**Steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project: "Admin Request Platform"
3. Enable Google+ API
4. Create OAuth 2.0 credentials (Web application)
5. Set authorized redirect URIs:
   - `http://localhost:3003/api/auth/callback/google`
   - `https://yourdomain.com/api/auth/callback/google`
6. Copy Client ID & Client Secret
7. Add to `.env.local`

### 4.9 Frontend Implementation

**Sign In Page:**
```typescript
// Display:
// - Google logo
// - "Sign in with Google"
// - "Continue with your @si-ware.com account"
// - Optional: "Sign in with other email (admin approval required)"

// On error:
// - "Your email domain is not authorized. Contact admin."
// - "This email is not on the allowed list. Request access."
```

**User Menu (Top Right):**
```typescript
// Show:
// - User avatar (from Google)
// - User name
// - Primary email
// - "Settings" link
// - "Sign out" link
```

**Redirect After Sign In:**
```typescript
// If first login: Show welcome + setup flow
// Otherwise: Redirect to last visited page or /dashboard
```

### 4.10 Implementation Steps

- [ ] Install NextAuth.js + Prisma Adapter
- [ ] Update User schema (googleId, additionalEmails, role)
- [ ] Create auth config with Google provider
- [ ] Set up Google OAuth credentials
- [ ] Create sign in / sign out / error pages
- [ ] Add middleware for route protection
- [ ] Add user menu to header
- [ ] Create API endpoint for multi-email management
- [ ] Add user profile page
- [ ] Test complete OAuth flow
- [ ] Test domain verification
- [ ] Test multi-email creation

---

## Implementation Timeline

### Week 1-2: Audit Trail & Comments
- [ ] Database schema (Audit Trail + Comments)
- [ ] API endpoints
- [ ] Frontend: Activity tab + Comment section
- [ ] Testing

### Week 2-3: Notifications
- [ ] Database schema (Notification + Preferences)
- [ ] Email service setup
- [ ] Notification triggers
- [ ] Frontend: Notification bell + Preferences page
- [ ] Testing

### Week 3-4: Google OAuth
- [ ] Database updates (User schema)
- [ ] NextAuth.js setup
- [ ] Google Cloud credentials
- [ ] Auth pages (signin, signout, error)
- [ ] Middleware protection
- [ ] Testing

### Week 4: Integration & Testing
- [ ] Full end-to-end testing
- [ ] Email testing
- [ ] Multi-email feature
- [ ] Performance optimization
- [ ] Documentation

---

## Success Criteria

✓ **Audit Trail:**
- All changes recorded with user, timestamp, old/new values
- Full request history visible on request detail page
- Filters work (by action, date, user)

✓ **Comments:**
- Users can add, edit, delete comments
- Mentions (@username) work and send notifications
- Rich text support (optional)
- Comment count shown on request cards

✓ **Notifications:**
- In-app notifications show in real-time
- Email notifications sent based on preferences
- Users can customize notification settings
- Do Not Disturb works correctly
- CC emails receive notifications

✓ **Google OAuth:**
- Only @si-ware.com users can sign in
- Multi-email support works
- Session persists across page reloads
- Protected routes redirect to sign in
- Sign out clears session completely
- User profile accessible

---

## Dependencies to Install

```bash
# Authentication
npm install next-auth @auth/prisma-adapter

# Email service (choose one)
npm install sendgrid @sendgrid/mail
# OR
npm install aws-sdk

# Rich text editor (optional)
npm install @tiptap/react @tiptap/starter-kit
```

---

## Recommendations

### 1. **Audit Trail**
- Keep it simple: use JSON field for flexible data
- Index by requestId for fast lookups
- Don't worry about storage - changes are rare

### 2. **Comments**
- Start without nested replies (Phase 2)
- Use Markdown for formatting
- Parse mentions with regex: `/@(\w+)/g`

### 3. **Notifications**
- Use email service for reliability
- Cache notification preferences in Redis (later)
- Consider async queue (Bull/BullMQ) for email sending
- Set up email templates ASAP

### 4. **Google OAuth**
- Use NextAuth.js (simplest & most secure)
- Restrict to @si-ware.com domain in callback
- Add admin interface for multi-email management
- Monitor failed sign-in attempts

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
│  Dashboard → Request Detail → Activity / Comments        │
│  Header: Notification Bell + User Menu                   │
│  Auth Pages: Sign in, Sign out, Error                    │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              API Routes / NextAuth.js                    │
│  /api/requests/:module/:id/history                       │
│  /api/requests/:module/:id/comments                      │
│  /api/notifications                                      │
│  /api/auth/* (NextAuth OAuth)                            │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│            Business Logic Services                       │
│  - historyService (Audit Trail)                          │
│  - commentService (Comments & Mentions)                  │
│  - notificationService (Triggers & Delivery)             │
│  - authService (Session, User Management)                │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│         External Services                                │
│  - PostgreSQL Database (Prisma ORM)                      │
│  - SendGrid / AWS SES (Email)                            │
│  - Google OAuth API                                      │
│  - Redis (Notifications Cache - Phase 2)                 │
└─────────────────────────────────────────────────────────┘
```

---

## Questions to Clarify

1. **Email Service**: SendGrid (easiest), AWS SES, or something else?
2. **Rich Text**: Simple markdown OK, or need full HTML editor?
3. **Nested Comments**: Start with flat comments or nested threads?
4. **Multi-Email Admin**: How should admins approve new emails? UI form or email verification?
5. **Team Size**: Who will implement OAuth? Frontend or backend team?

---

**Status:** Ready to begin Phase 1  
**Last Updated:** 2026-04-29  
**Next Step:** Confirm approach, then start with Audit Trail + Comments (simpler than OAuth)
