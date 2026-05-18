-- Add performance indexes
CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role");
CREATE INDEX IF NOT EXISTS "AuditLog_userId_action_createdAt_idx" ON "AuditLog"("userId", "action", "createdAt");
