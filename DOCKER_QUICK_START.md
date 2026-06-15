# Quick Start Guide - Docker Setup

Get your Admin Request Platform running with Docker in 5 minutes!

## Prerequisites

- **Docker Desktop** installed and running
- **Git** (already have it)
- ✅ Already in the project directory: `D:\SWS\Git-Repos\admin-request-platform`

---

## 🚀 5-Minute Setup

### Step 1: Create Environment File

**Windows PowerShell:**
```powershell
Copy-Item .env.docker .env.local
```

**Mac/Linux:**
```bash
cp .env.docker .env.local
```

### Step 2: Start Docker Desktop

Open the Docker Desktop application and wait for it to fully start.

### Step 3: Start All Services

**Windows PowerShell:**
```powershell
docker compose up -d
```

**Mac/Linux:**
```bash
docker compose up -d
```

Expected output:
```
[+] Running 2/2
 ✔ Container admin-request-platform-db   Started
 ✔ Container admin-request-platform-app  Started
```

### Step 4: Wait for Services to Initialize

```bash
# Wait about 10 seconds for the database to be fully ready
# Then run migrations
docker compose exec app npx prisma migrate deploy
```

### Step 5: Access the Application

Open your browser and go to:
```
http://localhost:3003
```

✅ **Done!** Your application is now running!

---

## 📊 Check Status

```bash
# See all running containers
docker compose ps

# View logs
docker compose logs -f app
```

---

## 🛠️ Using Helper Scripts

**For Windows (PowerShell):**
```powershell
# Make the script executable
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope CurrentUser

# Start containers
.\docker-manage.ps1 start

# View status
.\docker-manage.ps1 status

# View logs
.\docker-manage.ps1 logs app

# Access database shell
.\docker-manage.ps1 shell-db

# Stop containers
.\docker-manage.ps1 stop
```

**For Mac/Linux:**
```bash
# Make script executable
chmod +x docker-manage.sh

# Start containers
./docker-manage.sh start

# View status
./docker-manage.sh status

# View logs
./docker-manage.sh logs app

# Access database shell
./docker-manage.sh shell-db

# Stop containers
./docker-manage.sh stop
```

---

## 🗄️ Database Access

### Option 1: Access via Container Shell
```bash
docker compose exec db psql -U admin -d admin_request_platform
```

### Option 2: Access via Port 5432
- Host: `localhost`
- Port: `5432`
- Username: `admin`
- Password: `admin_password_123`
- Database: `admin_request_platform`

### Option 3: Using Prisma Studio
```bash
docker compose exec app npx prisma studio
```
Then open http://localhost:5555

---

## ⚠️ Troubleshooting

### Port Already in Use?

Change the port in `.env.local`:
```env
APP_PORT=3004          # Change 3003 to 3004
NEXTAUTH_URL=http://localhost:3004
```

Then restart:
```bash
docker compose down
docker compose up -d
```

### Services Won't Start?

```bash
# Check logs
docker compose logs app

# Try rebuilding
docker compose up -d --build

# Or hard reset
docker compose down -v
docker compose up -d
```

### Database Connection Error?

```bash
# Test database connectivity
docker compose exec app npx prisma db execute --stdin << 'EOF'
SELECT COUNT(*) FROM "User";
EOF
```

### Need to Reset Everything?

```bash
# Delete all containers and data
docker compose down -v

# Start fresh
docker compose up -d

# Run migrations again
docker compose exec app npx prisma migrate deploy
```

---

## 📝 Common Commands

```bash
# Start all services
docker compose up -d

# Stop all services (data persists)
docker compose stop

# Restart all services
docker compose restart

# View all logs
docker compose logs -f

# View app logs only
docker compose logs -f app

# View database logs only
docker compose logs -f db

# Stop and remove everything
docker compose down

# Stop and remove everything INCLUDING data
docker compose down -v

# Run database migrations
docker compose exec app npx prisma migrate deploy

# Backup database
docker compose exec db pg_dump -U admin admin_request_platform > backup.sql

# Restore from backup
docker compose exec -T db psql -U admin admin_request_platform < backup.sql
```

---

## 🔐 Security Notes

⚠️ **For Development Only**

Default credentials:
- DB User: `admin`
- DB Password: `admin_password_123`
- NEXTAUTH_SECRET: `your-secret-key-change-in-production`

### For Production:

1. Change all passwords in `.env.local`
2. Generate a new NEXTAUTH_SECRET:
   ```bash
   openssl rand -base64 32
   ```
3. Use environment variable secrets management
4. Enable HTTPS with a reverse proxy

---

## 📚 Full Documentation

For complete documentation, configuration options, and advanced usage:
→ See **`DOCKER_SETUP.md`**

---

## 🆘 Need Help?

1. **Check logs**: `docker compose logs -f`
2. **View status**: `docker compose ps`
3. **Read full guide**: `DOCKER_SETUP.md`
4. **Docker Desktop**: Ensure it's running (click the whale icon)

---

**Everything working?** Great! 🎉

Your Admin Request Platform is ready to use at **http://localhost:3003**
