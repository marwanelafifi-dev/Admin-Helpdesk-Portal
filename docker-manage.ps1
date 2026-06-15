# Docker Management Script for Admin Request Platform
# Windows PowerShell utility for managing the containerized application

param(
    [Parameter(Mandatory = $true, Position = 0)]
    [ValidateSet(
        'start', 'stop', 'restart', 'status', 'logs',
        'shell-app', 'shell-db', 'build', 'rebuild',
        'migrate', 'seed', 'backup', 'reset', 'clean'
    )]
    [string]$Command,

    [Parameter(Position = 1)]
    [string]$Service = 'all',

    [Parameter()]
    [int]$Lines = 50
)

function Show-Header {
    param([string]$Title)
    Write-Host "`n" -NoNewline
    Write-Host "╔$('═' * ($Title.Length + 2))╗" -ForegroundColor Cyan
    Write-Host "║ $Title ║" -ForegroundColor Cyan
    Write-Host "╚$('═' * ($Title.Length + 2))╝" -ForegroundColor Cyan
    Write-Host ""
}

function Show-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Show-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Show-Info {
    param([string]$Message)
    Write-Host "ℹ $Message" -ForegroundColor Yellow
}

# Check if Docker is running
function Test-Docker {
    try {
        docker ps > $null 2>&1
        return $true
    }
    catch {
        return $false
    }
}

# Start command
function Start-Containers {
    Show-Header "Starting Docker Containers"

    if (-not (Test-Docker)) {
        Show-Error "Docker is not running. Please start Docker Desktop."
        exit 1
    }

    Show-Info "Building and starting services..."
    docker compose up -d

    if ($LASTEXITCODE -eq 0) {
        Show-Success "Containers started successfully!"
        Show-Info "Application will be available at: http://localhost:3003"

        Show-Info "Waiting for database to be ready..."
        Start-Sleep -Seconds 5

        Show-Info "Running database migrations..."
        docker compose exec -T app npx prisma migrate deploy

        Show-Success "All services are running!"
        Get-Status
    }
    else {
        Show-Error "Failed to start containers"
        exit 1
    }
}

# Stop command
function Stop-Containers {
    Show-Header "Stopping Docker Containers"
    Show-Info "Stopping services..."
    docker compose stop

    if ($LASTEXITCODE -eq 0) {
        Show-Success "Containers stopped successfully!"
    }
    else {
        Show-Error "Failed to stop containers"
    }
}

# Restart command
function Restart-Containers {
    Show-Header "Restarting Docker Containers"
    Show-Info "Restarting services..."
    docker compose restart

    if ($LASTEXITCODE -eq 0) {
        Show-Success "Containers restarted successfully!"
        Get-Status
    }
    else {
        Show-Error "Failed to restart containers"
    }
}

# Status command
function Get-Status {
    Show-Header "Docker Containers Status"

    if (-not (Test-Docker)) {
        Show-Error "Docker is not running"
        return
    }

    docker compose ps

    Show-Info "Recent logs (last 5 lines):"
    docker compose logs --tail 5
}

# Logs command
function Show-Logs {
    Show-Header "Docker Logs"

    if ($Service -eq 'all') {
        Show-Info "Showing logs from all services (last $Lines lines)..."
        docker compose logs --tail $Lines -f
    }
    else {
        Show-Info "Showing logs from $Service service (last $Lines lines)..."
        docker compose logs --tail $Lines -f $Service
    }
}

# Shell access to app
function Access-AppShell {
    Show-Header "Accessing App Container Shell"
    Show-Info "Connecting to app container..."
    docker compose exec app sh
}

# Shell access to database
function Access-DBShell {
    Show-Header "Accessing Database Container Shell"
    Show-Info "Connecting to PostgreSQL container..."
    docker compose exec db psql -U admin -d admin_request_platform
}

# Build command
function Build-Image {
    Show-Header "Building Docker Image"
    Show-Info "Building application image..."
    docker compose build

    if ($LASTEXITCODE -eq 0) {
        Show-Success "Image built successfully!"
    }
    else {
        Show-Error "Failed to build image"
    }
}

# Rebuild command
function Rebuild-Everything {
    Show-Header "Rebuilding Everything"
    Show-Info "Removing old containers and rebuilding..."
    docker compose down -v
    docker compose up -d --build

    if ($LASTEXITCODE -eq 0) {
        Show-Success "Rebuild completed successfully!"
        Show-Info "Waiting for database to be ready..."
        Start-Sleep -Seconds 5

        Show-Info "Running database migrations..."
        docker compose exec -T app npx prisma migrate deploy

        Show-Success "All services are ready!"
    }
    else {
        Show-Error "Rebuild failed"
    }
}

# Migrate command
function Run-Migrations {
    Show-Header "Running Database Migrations"
    Show-Info "Executing Prisma migrations..."
    docker compose exec app npx prisma migrate deploy

    if ($LASTEXITCODE -eq 0) {
        Show-Success "Migrations completed successfully!"
    }
    else {
        Show-Error "Migrations failed"
    }
}

# Seed command
function Seed-Database {
    Show-Header "Seeding Database"
    Show-Info "Running database seed..."
    docker compose exec app npx prisma db seed

    if ($LASTEXITCODE -eq 0) {
        Show-Success "Database seeded successfully!"
    }
    else {
        Show-Error "Seed failed (this may be normal if no seed script exists)"
    }
}

# Backup command
function Backup-Database {
    Show-Header "Backing Up Database"

    $timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
    $backupFile = "backup_$timestamp.sql"

    Show-Info "Creating backup: $backupFile"
    docker compose exec db pg_dump -U admin admin_request_platform | Out-File -Encoding UTF8 $backupFile

    if ($LASTEXITCODE -eq 0) {
        Show-Success "Database backed up to: $backupFile"
    }
    else {
        Show-Error "Backup failed"
    }
}

# Reset command
function Reset-Database {
    Show-Header "Resetting Database"
    Show-Error "WARNING: This will DELETE all data!"

    $confirm = Read-Host "Type 'yes' to confirm"

    if ($confirm -eq 'yes') {
        Show-Info "Resetting database..."
        docker compose exec app npx prisma migrate reset --force

        if ($LASTEXITCODE -eq 0) {
            Show-Success "Database reset successfully!"
        }
        else {
            Show-Error "Reset failed"
        }
    }
    else {
        Show-Info "Reset cancelled"
    }
}

# Clean command
function Clean-Docker {
    Show-Header "Cleaning Up Docker Resources"
    Show-Error "WARNING: This will stop and remove all containers!"

    $confirm = Read-Host "Type 'yes' to confirm"

    if ($confirm -eq 'yes') {
        Show-Info "Stopping containers..."
        docker compose down -v

        if ($LASTEXITCODE -eq 0) {
            Show-Success "Docker cleanup completed!"
            Show-Info "Running: docker system prune"
            docker system prune -f
            Show-Success "System prune completed!"
        }
        else {
            Show-Error "Cleanup failed"
        }
    }
    else {
        Show-Info "Cleanup cancelled"
    }
}

# Main dispatcher
switch ($Command) {
    'start' { Start-Containers }
    'stop' { Stop-Containers }
    'restart' { Restart-Containers }
    'status' { Get-Status }
    'logs' { Show-Logs }
    'shell-app' { Access-AppShell }
    'shell-db' { Access-DBShell }
    'build' { Build-Image }
    'rebuild' { Rebuild-Everything }
    'migrate' { Run-Migrations }
    'seed' { Seed-Database }
    'backup' { Backup-Database }
    'reset' { Reset-Database }
    'clean' { Clean-Docker }
    default { Show-Error "Unknown command: $Command" }
}
