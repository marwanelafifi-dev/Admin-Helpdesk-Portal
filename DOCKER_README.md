# Docker Containerization - Admin Request Platform

Complete containerization of the Admin Request Platform with Docker Desktop, including Next.js frontend, PostgreSQL database, and isolated network configuration.

## 📋 What's Included

- ✅ **Dockerfile** - Multi-stage build for optimized Next.js application
- ✅ **docker-compose.yml** - Orchestration of all services (app + database)
- ✅ **Isolated Network** - Services in `admin-platform-network` (172.25.0.0/16)
- ✅ **PostgreSQL Database** - Persistent volume storage
- ✅ **Health Checks** - Automatic health monitoring
- ✅ **Auto-restart** - Containers restart on failure
- ✅ **Environment Configuration** - Easy .env setup
- ✅ **Management Scripts** - PowerShell (Windows) and Bash (Mac/Linux) helpers

---

## 🏗️ Architecture

```
Your Computer
│
├─ Docker Desktop
│  │
│  └─ Docker Network: admin-platform-network (172.25.0.0/16)
│     │
│     ├─ Container: admin-request-platform-db (PostgreSQL)
│     │  ├─ Port: 5432 (mapped to localhost:5432)
│     │  └─ Volume: postgres_data (persistent)
│     │
│     └─ Container: admin-request-platform-app (Next.js)
│        ├─ Port: 3003 (mapped to localhost:3003)
│        ├─ Health Check: HTTP GET / (every 30s)
│        └─ Environment: DATABASE_URL, NEXTAUTH_*
│
└─ Your Browser
   └─ http://localhost:3003
```

### Key Features

| Feature | Implementation |
|---------|-----------------|
| **Isolation** | Services in separate containers, isolated network |
| **Networking** | Custom bridge network (admin-platform-network) |
| **Persistence** | Named volume `postgres_data` for database |
| **Health** | Both services have health checks |
| **Restart** | Auto-restart unless explicitly stopped |
| **Logs** | Access via `docker compose logs` |
| **Ports** | App: 3003, DB: 5432 (configurable) |

---

## 📁 Project Files

### New Docker Files Created

```
admin-request-platform/
├── Dockerfile                    # Multi-stage build configuration
├── docker-compose.yml            # Service orchestration
├── .dockerignore                 # Files to exclude from Docker build
├── .env.docker                   # Docker environment template
├── docker-manage.ps1             # Windows management script
├── docker-manage.sh              # Mac/Linux management script
├── scripts/
│   └── init-db.sql              # Database initialization
└── DOCKER_*.md                   # Documentation files
```

---

## 🚀 Getting Started

### 1. Install Docker Desktop

- [Download Docker Desktop](https://www.docker.com/products/docker-desktop)
- Install and start the application
- Verify: `docker --version`

### 2. Create Environment File

```bash
# Copy template
cp .env.docker .env.local

# Or edit manually with your settings
```

### 3. Start Services

```bash
# Start all services
docker compose up -d

# Wait for initialization
# Then run migrations
docker compose exec app npx prisma migrate deploy
```

### 4. Access Application

```
http://localhost:3003
```

---

## 📖 Documentation Files

| File | Purpose |
|------|---------|
| **DOCKER_QUICK_START.md** | 5-minute setup guide (start here!) |
| **DOCKER_SETUP.md** | Complete reference documentation |
| **DOCKER_README.md** | This file - overview and architecture |

---

## 🎮 Common Commands

### Using docker compose directly:

```bash
# Start services
docker compose up -d

# Stop services
docker compose stop

# Restart services
docker compose restart

# View logs
docker compose logs -f app

# Check status
docker compose ps

# Access app container
docker compose exec app sh

# Access database
docker compose exec db psql -U admin -d admin_request_platform

# Run migrations
docker compose exec app npx prisma migrate deploy

# Backup database
docker compose exec db pg_dump -U admin admin_request_platform > backup.sql

# Delete everything
docker compose down -v
```

### Using helper scripts (Windows - PowerShell):

```powershell
.\docker-manage.ps1 start          # Start services
.\docker-manage.ps1 stop           # Stop services
.\docker-manage.ps1 status         # Check status
.\docker-manage.ps1 logs app       # View app logs
.\docker-manage.ps1 shell-db       # Access database
.\docker-manage.ps1 migrate        # Run migrations
.\docker-manage.ps1 backup         # Backup database
.\docker-manage.ps1 rebuild        # Rebuild everything
.\docker-manage.ps1 clean          # Remove everything
```

### Using helper scripts (Mac/Linux - Bash):

```bash
./docker-manage.sh start           # Start services
./docker-manage.sh stop            # Stop services
./docker-manage.sh status          # Check status
./docker-manage.sh logs app        # View app logs
./docker-manage.sh shell-db        # Access database
./docker-manage.sh migrate         # Run migrations
./docker-manage.sh backup          # Backup database
./docker-manage.sh rebuild         # Rebuild everything
./docker-manage.sh clean           # Remove everything
```

---

## 🔧 Configuration

### Environment Variables (.env.local)

```env
# Database
DB_USER=admin
DB_PASSWORD=admin_password_123
DB_NAME=admin_request_platform
DB_PORT=5432

# Application
NODE_ENV=production
APP_PORT=3003

# NextAuth
NEXTAUTH_URL=http://localhost:3003
NEXTAUTH_SECRET=your-secret-key-here

# Optional: Google OAuth
# AUTH_GOOGLE_ID=...
# AUTH_GOOGLE_SECRET=...
```

### Change Default Ports

Edit `.env.local`:
```env
APP_PORT=3000              # Change frontend port
DB_PORT=5433               # Change database port
NEXTAUTH_URL=http://localhost:3000  # Update this too
```

---

## 🧪 Testing the Setup

### 1. Check Containers Running

```bash
docker compose ps
```

Expected:
```
NAME                             STATUS
admin-request-platform-db        Up (healthy)
admin-request-platform-app       Up (healthy)
```

### 2. Check Database Connection

```bash
docker compose exec app npx prisma db execute --stdin << 'EOF'
SELECT COUNT(*) FROM "User";
EOF
```

### 3. Access Application

```bash
curl http://localhost:3003
```

Should return HTML of the application.

### 4. Check Network

```bash
docker network ls
docker network inspect admin-platform-network
```

---

## 📊 Monitoring

### View Real-time Resource Usage

```bash
docker stats
```

### View Container Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f app
docker compose logs -f db

# Last N lines
docker compose logs --tail 100
```

### Check Service Health

```bash
# Get detailed status
docker compose ps

# Check specific container
docker inspect admin-request-platform-app
```

---

## 🗄️ Database Management

### Connect to Database

```bash
# Option 1: Via container
docker compose exec db psql -U admin -d admin_request_platform

# Option 2: Via network port (from your machine)
psql -h localhost -U admin -d admin_request_platform
# Password: admin_password_123

# Option 3: Visual Studio Code
# Install "PostgreSQL Explorer" extension
# Connect to: postgresql://admin:admin_password_123@localhost:5432/admin_request_platform
```

### Backup Database

```bash
# Create SQL backup
docker compose exec db pg_dump -U admin admin_request_platform > backup.sql

# Compress backup
docker compose exec db pg_dump -U admin admin_request_platform | gzip > backup.sql.gz
```

### Restore Database

```bash
# Restore from backup
docker compose exec -T db psql -U admin admin_request_platform < backup.sql

# Restore from compressed backup
gunzip -c backup.sql.gz | docker compose exec -T db psql -U admin admin_request_platform
```

### View Database Stats

```bash
docker compose exec db psql -U admin admin_request_platform -c "
SELECT table_name, pg_size_pretty(pg_total_relation_size(table_name)) as size 
FROM information_schema.tables 
WHERE table_schema='public' 
ORDER BY pg_total_relation_size(table_name) DESC;
"
```

---

## 🔐 Security Notes

### Development Environment

Current setup is designed for **local development** with basic credentials.

⚠️ **Do NOT use in production** without:

1. **Strong Passwords**
   ```bash
   # Generate random password
   openssl rand -base64 32
   ```

2. **Strong NEXTAUTH_SECRET**
   ```bash
   # Generate secret
   openssl rand -base64 32
   ```

3. **HTTPS/TLS**
   - Use reverse proxy (Nginx, Traefik)
   - Install SSL certificates

4. **Network Security**
   - Close database port (5432) from external access
   - Use firewall rules
   - Use VPN/internal networks

5. **Secrets Management**
   - Use Docker Secrets
   - Use environment management tools
   - Never commit `.env` files

---

## 🆘 Troubleshooting

### Port Already in Use

```bash
# Find process using port
# Windows
netstat -ano | findstr :3003

# Mac/Linux
lsof -i :3003

# Kill process and restart Docker
```

### Docker not starting

```bash
# Make sure Docker Desktop is running
# Check system requirements:
# - Virtualization enabled in BIOS
# - WSL 2 installed (Windows)
# - Resources allocated in Docker Desktop settings
```

### Container crashes on startup

```bash
# Check logs
docker compose logs app

# Rebuild
docker compose up -d --build

# Hard reset
docker compose down -v
docker compose up -d
```

### Database won't connect

```bash
# Test database is running
docker compose ps db

# Check logs
docker compose logs db

# Verify connection string
docker compose exec app sh -c 'echo $DATABASE_URL'

# Test connectivity
docker compose exec app npx prisma db execute --stdin << 'EOF'
SELECT version();
EOF
```

---

## 📚 Additional Resources

### Docker Documentation
- [Docker Docs](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)

### Container Images
- [Node.js Image](https://hub.docker.com/_/node)
- [PostgreSQL Image](https://hub.docker.com/_/postgres)

### Application Frameworks
- [Next.js Deployment](https://nextjs.org/docs/deployment/docker)
- [Prisma Docker Guide](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-docker)

### Learning Resources
- [Docker Tutorial](https://docs.docker.com/guides/getting-started/)
- [Docker Compose Tutorial](https://docs.docker.com/compose/gettingstarted/)

---

## ✅ Verification Checklist

- [ ] Docker Desktop installed and running
- [ ] `.env.local` created from `.env.docker`
- [ ] `docker compose up -d` succeeds
- [ ] Both containers show "healthy" status
- [ ] `http://localhost:3003` loads in browser
- [ ] Database migrations run successfully
- [ ] Can access database via `docker compose exec db psql ...`
- [ ] Helper scripts work (if using them)

---

## 📞 Support

1. **Check DOCKER_SETUP.md** for detailed troubleshooting
2. **View logs**: `docker compose logs -f`
3. **Test connectivity**: `docker compose exec app curl http://db:5432`
4. **Verify volumes**: `docker volume ls`
5. **Check network**: `docker network inspect admin-platform-network`

---

## 🎯 Next Steps

1. ✅ **Setup Complete** - Your app is running!
2. 📝 **Development** - See CLAUDE.md for development roadmap
3. 🚀 **Production** - Refer to production deployment notes in DOCKER_SETUP.md
4. 🧪 **Testing** - Run tests inside container: `docker compose exec app npm test`

---

**Version**: 1.0  
**Updated**: May 2026  
**Status**: ✅ Production-Ready (with security considerations)
