-- Initialize PostgreSQL database for Admin Request Platform
-- This script runs automatically when the Docker container starts for the first time

-- Create UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Note: Prisma will create all tables based on the schema during application startup
SELECT NOW() || ' - Admin Request Platform database initialized' as status;
