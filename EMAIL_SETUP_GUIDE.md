# Email Configuration & Troubleshooting Guide

## Current Status

The email system is **fully implemented** but currently **failing to connect to SMTP**. The error is:
```
POST /api/notifications/email error: Error: Connection closed unexpectedly
```

This is a **Gmail SMTP authentication issue**, not a code issue.

## How Email Works

When a request status is updated or a comment is added:

1. **Frontend** calls `createRequestUpdateNotifications()` in `notificationStore.ts`
2. **Notification Service** sends a POST request to `/api/notifications/email`
3. **API Route** (`src/app/api/notifications/email/route.ts`) receives the update
4. **Email Service** (`src/lib/emailService.ts`) attempts to send via nodemailer + SMTP
5. **Email Recipients:**
   - Admin team (Super Admin, Admin roles)
   - Request owner (if not the person making the change)
   - HR team (for HR module updates)

## Email Configuration

### Environment Variables Required

```env
# SMTP Server Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=marwan.elafifi@si-ware.com
SMTP_PASSWORD=<your-app-password>
SMTP_FROM=Si-Ware Admin Helpdesk <marwan.elafifi@si-ware.com>
EMAIL_REPLY_TO=marwan.elafifi@si-ware.com
```

### Issue: Gmail SMTP Connection Failed

**Error Message:**
```
Error: Connection closed unexpectedly
```

**Root Cause:** Gmail requires an **App Password**, not your regular account password.

### Fix: Generate Gmail App Password

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification** (if not already enabled)
3. Go to **App passwords** → Select "Mail" and "Windows Computer"
4. Google will generate a 16-character password
5. Copy it and update `.env.local`:
   ```env
   SMTP_PASSWORD=<16-char-password-from-google>
   ```
6. Restart Docker containers:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

### Alternative: Use a Different Email Service

If Gmail is not suitable, use:

- **SendGrid** (recommended for production)
- **Mailgun**
- **AWS SES**
- **Your corporate mail server** (mail.si-ware.com)

#### Option A: Switch to mail.si-ware.com

Update `.env.local`:
```env
SMTP_HOST=mail.si-ware.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@si-ware.com
SMTP_PASSWORD=your-password
```

## Testing Email Configuration

### Method 1: Check Docker Logs

```bash
docker-compose logs app --tail 50 | grep -i email
```

Look for:
- ✓ "[email] Sending request update notification"
- ✓ "[email] Successfully sent request update notification"
- ✗ "Connection closed unexpectedly"

### Method 2: Test via API (once fixed)

```bash
curl -X POST http://localhost:3003/api/email/test \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "testSmtpConfig": false
  }'
```

Expected response on success:
```json
{
  "success": true,
  "message": "Test email sent to test@example.com"
}
```

## What Emails Are Sent

### 1. Status Update Notifications

When a request status changes:

```
To: Request owner, Admin team
Subject: Request Title - REQUEST-ID
Content: Detailed status change information
```

### 2. Comment Notifications

When a comment is added:

```
To: Request owner, Admin team, relevant team members
Subject: New comment on request: Request Title - REQUEST-ID
Content: Comment preview (first 60 chars)
```

## Email Features Implemented

- ✅ SMTP with nodemailer
- ✅ Retry logic (2 attempts with exponential backoff)
- ✅ Connection pooling
- ✅ TLS/SSL support
- ✅ HTML email templates (professionally designed)
- ✅ Reply-to headers for email threading
- ✅ Message IDs for proper email conversation grouping
- ✅ Recipients list filtering (no duplicates, no self-emails)
- ✅ Error logging and diagnostics
- ✅ Graceful fallback (email failures don't crash the app)

## Production Deployment Checklist

- [ ] Update `SMTP_PASSWORD` with valid Gmail App Password or corporate email credentials
- [ ] Update `SMTP_FROM` to match your organization's branding
- [ ] Update `NEXTAUTH_URL` for email links (not localhost)
- [ ] Test status update email (check logs)
- [ ] Test comment notification email
- [ ] Verify recipients are correct (check in app notifications)
- [ ] Monitor SMTP failures in logs weekly

## Related Files

- **Email Service:** `src/lib/emailService.ts`
- **Notification API:** `src/app/api/notifications/email/route.ts`
- **Notification Store:** `src/lib/notificationStore.ts`
- **Email Sync:** `src/app/api/email/sync/route.ts` (for reply parsing)
- **Inbound Email Handler:** `src/app/api/email/inbound/route.ts` (for email replies)
