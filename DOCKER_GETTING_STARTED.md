# Getting Started with Docker - Visual Guide

Visual step-by-step guide to run your Admin Request Platform with Docker Desktop.

---

## 📦 Prerequisites Checklist

Before you start, make sure you have:

```
✅ Windows 10/11 or Mac or Linux
✅ Docker Desktop installed (https://www.docker.com/products/docker-desktop)
✅ Git installed (for cloning/already have it)
✅ This project directory open
```

**Verify Docker is installed:**
```bash
docker --version
docker compose version
```

Should show version 20.10+ and 2.x+

---

## 🎬 5-Minute Quick Start

### Step 1️⃣: Create Environment File

**Windows PowerShell:**
```powershell
Copy-Item .env.docker .env.local
```

**Mac/Linux Terminal:**
```bash
cp .env.docker .env.local
```

**Expected result:** New file `.env.local` appears in your project folder

---

### Step 2️⃣: Start Docker Desktop

1. Click the Docker Desktop icon on your taskbar/dock
2. Wait for the whale icon to be fully loaded (not animating)
3. Status should show "Docker Desktop is running"

![Docker Desktop Running](expected: whale icon in system tray)

---

### Step 3️⃣: Open Terminal/PowerShell

**Windows:**
- Open PowerShell or Command Prompt
- Navigate to: `cd D:\SWS\Git-Repos\admin-request-platform`

**Mac/Linux:**
- Open Terminal
- Navigate to your project directory

---

### Step 4️⃣: Start All Services

**Type this command:**

```bash
docker compose up -d
```

**Expected output:**
```
[+] Running 2/2
 ✔ Container admin-request-platform-db   Started
 ✔ Container admin-request-platform-app  Started
```

✅ **Both services should start without errors**

---

### Step 5️⃣: Wait for Database Initialization

**Wait 10 seconds**, then run migrations:

```bash
docker compose exec app npx prisma migrate deploy
```

**Expected output:**
```
Applying migration `20240506000000_init`
Applying migration `20240506000001_add_features`
...
The database has been successfully migrated.
```

✅ **Database is now initialized**

---

### Step 6️⃣: Open Application in Browser

**Visit:** `http://localhost:3003`

You should see your Admin Request Platform dashboard!

✅ **You're done!** 🎉

---

## ✔️ Verify Everything Is Working

### Check Container Status

```bash
docker compose ps
```

Should show:

| NAME | STATUS |
|------|--------|
| admin-request-platform-db | Up (healthy) |
| admin-request-platform-app | Up (healthy) |

---

### Check Application Logs

```bash
docker compose logs -f app
```

Should show:
```
ready - started server on 0.0.0.0:3003, url: http://localhost:3003
```

---

### Test Database Connection

```bash
docker compose exec app npx prisma db execute --stdin << 'EOF'
SELECT COUNT(*) FROM "User";
EOF
```

Should show a number (count of users) without errors.

---

## 🎮 Essential Commands

### ⏹️ Stop Services (Keep Data)

```bash
docker compose stop
```

Data persists. Restart anytime with `docker compose start`

---

### ▶️ Restart Services

```bash
docker compose restart
```

---

### 📋 View Logs

```bash
# All services
docker compose logs -f

# Just the app
docker compose logs -f app

# Just the database
docker compose logs -f db

# Last 50 lines
docker compose logs --tail 50
```

---

### 🗄️ Access Database

```bash
docker compose exec db psql -U admin -d admin_request_platform
```

Then use SQL commands. Type `\q` to exit.

---

### 🧹 Clean Up (Delete Everything)

```bash
docker compose down -v
```

⚠️ **WARNING:** This deletes all data!

---

## 🚨 Common Issues & Quick Fixes

### ❌ "docker: command not found"

**Fix:** Make sure Docker Desktop is fully started (click the whale icon)

---

### ❌ "bind: address already in use"

**Fix:** Port 3003 is already in use. Change it:

1. Open `.env.local`
2. Find: `APP_PORT=3003`
3. Change to: `APP_PORT=3000`
4. Restart: `docker compose restart`

---

### ❌ Container exits immediately

**Fix:** Check the logs

```bash
docker compose logs app
```

Look for error messages. Common causes:
- Port conflict
- Missing environment variables
- Database not ready yet

---

### ❌ "Cannot connect to database"

**Fix:** Database might still be starting

```bash
# Wait a few seconds and check status
docker compose ps

# Should show db as "healthy"
# If not, restart it
docker compose restart db

# Wait 5 seconds, then try again
docker compose logs -f db
```

---

### ❌ Browser shows "Connection refused"

**Fix:** App might not be fully started

```bash
# Check if app is running
docker compose ps

# If not healthy, check logs
docker compose logs app

# Restart if needed
docker compose restart app
```

---

## 🔍 Monitoring & Diagnostics

### View Resource Usage

```bash
docker stats
```

Shows real-time CPU, memory, network usage

---

### See What's Running

```bash
# Containers
docker ps

# Images
docker images

# Networks
docker network ls

# Volumes
docker volume ls
```

---

### Test Connectivity

```bash
# From app container to database
docker compose exec app ping db

# From your machine to app
curl http://localhost:3003

# From your machine to database (if psql installed)
psql -h localhost -U admin -d admin_request_platform
```

---

## 📖 When You Need Help

| Need | Reference |
|------|-----------|
| Quick setup | This file (DOCKER_GETTING_STARTED.md) |
| 5-min guide | DOCKER_QUICK_START.md |
| Full details | DOCKER_SETUP.md |
| Overview | DOCKER_README.md |
| Summary | DOCKER_IMPLEMENTATION_SUMMARY.md |

---

## 🎯 Using Helper Scripts (Optional)

If you don't want to remember docker commands, use the scripts:

### Windows PowerShell

```powershell
# Make scripts executable (one time)
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope CurrentUser

# Start services
.\docker-manage.ps1 start

# Check status
.\docker-manage.ps1 status

# View logs
.\docker-manage.ps1 logs app

# Access database shell
.\docker-manage.ps1 shell-db

# Stop services
.\docker-manage.ps1 stop

# More options
.\docker-manage.ps1 help
```

### Mac/Linux

```bash
# Make scripts executable (one time)
chmod +x docker-manage.sh

# Start services
./docker-manage.sh start

# Check status
./docker-manage.sh status

# View logs
./docker-manage.sh logs app

# Access database shell
./docker-manage.sh shell-db

# Stop services
./docker-manage.sh stop

# More options (see help)
./docker-manage.sh help
```

---

## 📊 What's Running Inside

### Container: admin-request-platform-db

- **Database**: PostgreSQL 16
- **Port**: 5432 (inside), mapped to localhost:5432
- **User**: admin
- **Password**: admin_password_123 (change in production!)
- **Database**: admin_request_platform
- **Data**: Persists in `postgres_data` volume

### Container: admin-request-platform-app

- **Runtime**: Node.js 20
- **Framework**: Next.js 15
- **Port**: 3003 (inside), mapped to localhost:3003
- **Environment**: Production optimized
- **Database**: Connected to PostgreSQL via DATABASE_URL

---

## 🌐 Network Architecture

```
Your Computer
    ↓
Docker Desktop
    ↓
admin-platform-network (isolated bridge network)
    ├─ db:5432 (PostgreSQL)
    └─ app:3003 (Next.js)
         ↓
    Accessed via localhost:3003
```

Services are isolated from other Docker containers on your system.

---

## 🔐 Important Notes

### Development (Current Setup)

✅ Perfect for local development  
✅ Easy to reset and restart  
✅ Default credentials are simple

### Production (Before Going Live)

⚠️ Change all passwords  
⚠️ Generate new NEXTAUTH_SECRET  
⚠️ Enable HTTPS/TLS  
⚠️ Close database port  
⚠️ Use secrets management  
⚠️ Set up monitoring & backups  

See DOCKER_SETUP.md for production checklist.

---

## 🎓 Learning Resources

- **Docker Docs**: https://docs.docker.com/
- **Docker Compose**: https://docs.docker.com/compose/
- **Next.js Docker**: https://nextjs.org/docs/deployment/docker
- **PostgreSQL**: https://www.postgresql.org/docs/

---

## ✅ Success Checklist

After following this guide, you should have:

- [ ] Docker Desktop running
- [ ] `.env.local` created
- [ ] `docker compose up -d` executed successfully
- [ ] Both containers showing "healthy" in `docker compose ps`
- [ ] Database migrations completed
- [ ] Application accessible at http://localhost:3003
- [ ] Can view app logs with `docker compose logs -f app`
- [ ] Can access database with `docker compose exec db psql ...`

**If all checkboxes are checked, you're all set!** 🎉

---

## 🆘 Still Having Issues?

1. **Check Docker is running**
   - Look for whale icon in system tray
   - Open Docker Desktop if not running

2. **Check logs**
   ```bash
   docker compose logs -f
   ```

3. **Verify ports are available**
   ```bash
   # Windows
   netstat -ano | findstr :3003
   
   # Mac/Linux
   lsof -i :3003
   ```

4. **Try a hard restart**
   ```bash
   docker compose down
   docker compose up -d
   ```

5. **Read full documentation**
   - DOCKER_SETUP.md has extensive troubleshooting

6. **Check your .env.local**
   - Should have been created from .env.docker
   - Should have all required variables set

---

## 🚀 Next Steps After Setup

1. **Log in** with your credentials
2. **Explore** the dashboard and modules
3. **Try features** like creating requests
4. **Test** different user roles
5. **Check logs** to understand how it works
6. **Read documentation** for advanced usage

---

## 📞 Quick Reference

```bash
# Start
docker compose up -d

# Stop
docker compose stop

# Restart
docker compose restart

# Status
docker compose ps

# Logs
docker compose logs -f app

# Database
docker compose exec db psql -U admin -d admin_request_platform

# Migrations
docker compose exec app npx prisma migrate deploy

# Backup
docker compose exec db pg_dump -U admin admin_request_platform > backup.sql

# Clean up
docker compose down -v
```

---

**You're all set! Your Admin Request Platform is now running in Docker.** 🎉

Open http://localhost:3003 and start using the application!

For questions or issues, refer to the detailed documentation files or the helper scripts.

---

**Version**: 1.0  
**Last Updated**: May 6, 2026
