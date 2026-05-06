-- Initialize PostgreSQL database for Admin Request Platform
-- This script runs automatically when the Docker container starts for the first time

-- Create UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create index on commonly queried columns for performance
CREATE INDEX IF NOT EXISTS idx_requests_module ON public."Request"(module);
CREATE INDEX IF NOT EXISTS idx_requests_status ON public."Request"(status);
CREATE INDEX IF NOT EXISTS idx_requests_requester ON public."Request"("requesterId");
CREATE INDEX IF NOT EXISTS idx_users_email ON public."User"(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public."User"(role);

-- Log initialization
-- Note: Prisma will create all other tables based on the schema
SELECT NOW() || ' - Admin Request Platform database initialized';
