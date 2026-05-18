# Docker Setup Guide - Admin Request Platform

Complete guide to running the Admin Request Platform with Docker Desktop, including the Next.js frontend, PostgreSQL database, and all services in an isolated network.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Quick Start](#quick-start)
4. [Configuration](#configuration)
5. [Running the Application](#running-the-application)
6. [Database Management](#database-management)
7. [Troubleshooting](#troubleshooting)
8. [Cleanup](#cleanup)

---

## Prerequisites

### Required
- **Docker Desktop** (Windows/Mac) or Docker Engine (Linux)
  - [Download Docker Desktop](https://www.docker.com/products/docker-desktop)
  - Version: 20.10+ (preferably latest)
- **Git** (for cloning the repository)
- **Node.js** (version 20+) - only for local development, not needed for Docker

### Verify Installation

```powershell
# Check Docker version
docker --version
docker compose version

# Expected output:
# Docker version 26.x.x (or higher)
# Docker Compose version 2.x.x (or higher)
```

---

## Architecture Overview

### Services Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              Docker Container Network                       │
│         (admin-platform-network: 172.25.0.0/16)            │
│                                                              │
│  ┌──────────────────┐              ┌─────────────────────┐ │
│  │  Next.js App     │              │  PostgreSQL DB      │ │
│  │  (Frontend)      │──────────────▶│  (Database)         │ │
│  │  Port: 3003      │ TCP/5432     │  Port: 5432         │ │
│  │  Container: app  │              │  Container: db      │ │
│  └──────────────────┘              └─────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
         │                                    │
         └─── Port 3003 (Localhost)         └─── Port 5432 (Localhost)
              Access via: http://localhost:3003
```

### Network Configuration

- **Network Name**: `admin-platform-network`
- **Driver**: Bridge
- **Subnet**: `172.25.0.0/16`
- **Isolation**: Services are isolated from other containers on the host

### Services

| Service | Container | Role | Port | Health Check |
|---------|-----------|------|------|--------------|
| **PostgreSQL** | admin-request-platform-db | Database | 5432 | pg_isready |
| **Next.js App** | admin-request-platform-app | Frontend/Server | 3003 | HTTP GET / |

---

## Quick Start

### 1. Clone & Navigate to Project

```powershell
cd D:\SWS\Git-Repos\admin-request-platform
```

### 2. Create Environment File

```powershell
# Copy the Docker environment template
Copy-Item .env.docker .env.local
```

**Or create `.env.local` manually:**

```env
# Database
DB_USER=admin
DB_PASSWORD=admin_password_123
DB_NAME=admin_request_platform
DB_PORT=5432

# Application
NODE_ENV=production
APP_PORT=3003
NEXTAUTH_URL=http://localhost:3003
NEXTAUTH_SECRET=your-secure-random-string-here-change-in-production
```

### 3. Start Docker Compose

```powershell
# Build and start all services
docker compose up -d

# Expected output:
# [+] Running 2/2
#  ✔ Container admin-request-platform-db   Started
#  ✔ Container admin-request-platform-app  Started
```

### 4. Run Database Migrations

```powershell
# Run Prisma migrations (creates tables from schema)
docker compose exec app npx prisma migrate deploy

# Seed mock data (optional - if you have seed scripts)
docker compose exec app npx prisma db seed
```

### 5. Access Application

Open your browser and navigate to:

```
http://localhost:3003
```

---

## Configuration

### Environment Variables

Create a `.env.local` file in the project root:

```env
# ============================================
# DATABASE CONFIGURATION
# ============================================
DB_USER=admin                          # PostgreSQL username
DB_PASSWORD=admin_password_123         # PostgreSQL password (change in production!)
DB_NAME=admin_request_platform         # Database name
DB_PORT=5432                           # PostgreSQL port (inside container)

# ============================================
# APPLICATION CONFIGURATION
# ============================================
NODE_ENV=production                    # production, development, or test
APP_PORT=3003                          # Next.js app port

# ============================================
# NEXTAUTH CONFIGURATION
# ============================================
NEXTAUTH_URL=http://localhost:3003     # Full URL accessible from browser
NEXTAUTH_SECRET=your-secret-key        # Use: openssl rand -base64 32

# ============================================
# OPTIONAL: GOOGLE OAUTH
# ============================================
# AUTH_GOOGLE_ID=your-google-client-id.apps.googleusercontent.com
# AUTH_GOOGLE_SECRET=your-google-client-secret

# ============================================
# OPTIONAL: CORPORATE SSL (Development Only)
# ============================================
# DISABLE_TLS_CERT_CHECK=true            # Only for local dev with self-signed certs
```

### Generate NEXTAUTH_SECRET

```powershell
# Using OpenSSL (if available)
openssl rand -base64 32

# Or use Node.js
docker run --rm node:20-alpine node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Custom Port Configuration

To run on a different port, update `.env.local`:

```env
APP_PORT=3000          # Change from 3003 to 3000
NEXTAUTH_URL=http://localhost:3000  # Update this too
```

---

## Running the Application

### Start Services

```powershell
# Start all services in background
docker compose up -d

# Or start with logs visible
docker compose up
```

### Check Service Status

```powershell
# View running containers
docker compose ps

# Expected output:
# NAME                             STATUS
# admin-request-platform-db        Up (healthy)
# admin-request-platform-app       Up (healthy)
```

### View Logs

```powershell
# View logs from all services
docker compose logs -f

# View logs from specific service
docker compose logs -f app      # Next.js app logs
docker compose logs -f db       # Database logs

# View last 50 lines
docker compose logs --tail 50
```

### Stop Services

```powershell
# Stop all services (data persists)
docker compose stop

# Or pause services
docker compose pause
```

### Restart Services

```powershell
# Restart all services
docker compose restart

# Restart specific service
docker compose restart app
```

---

## Database Management

### Access Database Directly

```powershell
# Connect to PostgreSQL via psql
docker compose exec db psql -U admin -d admin_request_platform

# Or use pgAdmin (add to docker-compose.yml)
```

### Run Migrations

```powershell
# Run pending migrations
docker compose exec app npx prisma migrate deploy

# Create new migration
docker compose exec app npx prisma migrate dev --name add_new_feature

# View migration status
docker compose exec app npx prisma migrate status
```

### Seed Database

```powershell
# If you have a seed script
docker compose exec app npx prisma db seed
```

### View Database Schema

```powershell
# Generate Prisma client and view schema
docker compose exec app npx prisma generate

# Open Prisma Studio
docker compose exec app npx prisma studio
```

### Reset Database (WARNING: Deletes all data)

```powershell
# Reset database (dev only - deletes everything)
docker compose exec app npx prisma migrate reset --force

# Delete only data, keep schema
docker compose exec app npx prisma db execute --stdin << 'EOF'
TRUNCATE TABLE "User" CASCADE;
TRUNCATE TABLE "Request" CASCADE;
EOF
```

### Backup Database

```powershell
# Create backup
docker compose exec db pg_dump -U admin admin_request_platform > backup.sql

# Restore from backup
docker compose exec -T db psql -U admin admin_request_platform < backup.sql
```

---

## Troubleshooting

### Common Issues

#### ❌ `docker compose up` fails with "bind: address already in use"

**Solution:** Port 3003 or 5432 is already in use. Change ports in `.env.local`:

```env
APP_PORT=3004           # Change from 3003
DB_PORT=5433            # Change from 5432
```

Or kill the process using the port:

```powershell
# On Windows - find and kill process on port 3003
netstat -ano | findstr :3003
taskkill /PID <PID> /F

# On Mac/Linux
lsof -i :3003
kill -9 <PID>
```

#### ❌ `Container admin-request-platform-app` fails to start

**Check logs:**

```powershell
docker compose logs app
```

**Common causes:**
- Database not ready yet - wait 10 seconds and retry
- Missing environment variables - check `.env.local`
- Build failed - rebuild: `docker compose up -d --build`

**Solution:**

```powershell
# Rebuild the image
docker compose up -d --build

# Remove and recreate containers
docker compose down
docker compose up -d
```

#### ❌ Database migrations fail

**Check database status:**

```powershell
docker compose exec db psql -U admin -d admin_request_platform -c "SELECT version();"
```

**Manually run migrations:**

```powershell
# Reset migrations (dev only)
docker compose exec app npx prisma migrate resolve --rolled-back migrate_name

# Run all migrations
docker compose exec app npx prisma migrate deploy

# Check migration status
docker compose exec app npx prisma migrate status
```

#### ❌ "Cannot connect to database" errors

**Verify database connectivity:**

```powershell
# Test connection
docker compose exec app npx prisma db execute --stdin << 'EOF'
SELECT COUNT(*) FROM "User";
EOF

# Check DATABASE_URL is correct
docker compose exec app sh -c 'echo $DATABASE_URL'
```

#### ❌ Application port won't open in browser

**Verify port mapping:**

```powershell
# Check if app is listening
docker compose exec app curl http://localhost:3003

# Check port mapping
docker compose ps
netstat -ano | findstr :3003
```

#### ❌ Docker Desktop not running

**Solution:**

1. Open Docker Desktop application
2. Wait for it to fully start (icon shows whale, not loading)
3. Verify with: `docker --version`

#### ❌ "docker compose: command not found"

**Solution:** Docker Compose might not be in PATH

```powershell
# Verify Docker Compose is installed
docker compose version

# Or use: docker-compose (older versions)
docker-compose up -d
```

### Debug Mode

For detailed troubleshooting, enable debug logging:

```powershell
# Set debug environment
$env:DOCKER_BUILDKIT=1
$env:COMPOSE_DOCKER_CLI_BUILD=1

# Rebuild and start
docker compose up -d --build
```

### View Container System Resources

```powershell
# Monitor resource usage
docker stats

# View specific container
docker stats admin-request-platform-app
```

---

## Cleanup

### Stop All Services (Keep Volumes)

```powershell
# Stop containers but keep data
docker compose down

# Restart later with: docker compose up -d
```

### Remove Everything (Delete Data)

```powershell
# Delete containers, networks, and volumes
docker compose down -v

# Warning: This deletes the database!
```

### Clean Up Docker System

```powershell
# Remove unused images, containers, networks
docker system prune

# Remove all unused data (more aggressive)
docker system prune -a --volumes
```

### Force Stop Everything

```powershell
# Kill all containers
docker compose kill

# Remove all containers
docker compose rm -f
```

---

## Advanced Configuration

### Custom Network with Other Containers

If you want to connect other containers to the same network:

```powershell
# Create a shared custom network (optional)
docker network create admin-platform-network-custom

# Update docker-compose.yml to use external network:
# networks:
#   admin-platform-network:
#     external: true
#     name: admin-platform-network-custom
```

### Running Multiple Instances

To run multiple isolated instances of the platform:

```powershell
# Instance 1 (default)
docker compose up -d

# Instance 2 (different ports)
docker compose -f docker-compose.yml -p admin-platform-2 up -d
```

### Health Checks & Auto-Restart

Services are configured to:
- Auto-restart on failure (`restart: unless-stopped`)
- Health checks every 30 seconds
- Start period of 5-10 seconds before health checks begin

---

## Production Deployment Notes

⚠️ **Before deploying to production:**

1. **Change NEXTAUTH_SECRET** - Use a strong, unique value
2. **Change DB_PASSWORD** - Use a strong password
3. **Update NEXTAUTH_URL** - Point to your production domain
4. **Set NODE_ENV=production** - For optimal performance
5. **Enable HTTPS** - Use a reverse proxy (Nginx, Traefik)
6. **Mount persistent volumes** - For database data
7. **Set resource limits** - Add CPU/memory limits in docker-compose.yml
8. **Use secrets management** - Consider Docker Secrets or environment managers
9. **Regular backups** - Implement automated database backups
10. **Monitor logs** - Implement log aggregation (ELK, Loki, etc.)

---

## Support & Documentation

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres)
- [Next.js Docker Guide](https://nextjs.org/docs/deployment/docker)
- [Prisma Docker Guide](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-docker)

---

## Quick Reference

```powershell
# Most used commands
docker compose up -d              # Start all services
docker compose down               # Stop all services
docker compose logs -f app        # View app logs
docker compose ps                 # Check status
docker compose exec app sh        # Access app container
docker compose exec db psql ...   # Access database

# Database commands
docker compose exec app npx prisma migrate deploy    # Run migrations
docker compose exec app npx prisma studio            # Open Prisma Studio
docker compose exec db pg_dump ...                   # Backup database
```

---

**Version**: 1.0  
**Last Updated**: May 2026  
**Maintained by**: Admin Request Platform Team
