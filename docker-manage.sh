#!/bin/bash

# Docker Management Script for Admin Request Platform
# Bash utility for managing the containerized application on Mac/Linux

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Functions
show_header() {
    local title=$1
    echo -e "\n${CYAN}╔════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║ ${title}${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════╝${NC}\n"
}

show_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

show_error() {
    echo -e "${RED}✗ $1${NC}"
}

show_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

test_docker() {
    if ! command -v docker &> /dev/null; then
        return 1
    fi
    if ! docker ps &> /dev/null; then
        return 1
    fi
    return 0
}

# Commands
start_containers() {
    show_header "Starting Docker Containers"

    if ! test_docker; then
        show_error "Docker is not running or not installed"
        exit 1
    fi

    show_info "Building and starting services..."
    docker compose up -d

    show_success "Containers started successfully!"
    show_info "Application will be available at: http://localhost:3003"

    show_info "Waiting for database to be ready..."
    sleep 5

    show_info "Running database migrations..."
    docker compose exec -T app npx prisma migrate deploy

    show_success "All services are running!"
    get_status
}

stop_containers() {
    show_header "Stopping Docker Containers"
    show_info "Stopping services..."
    docker compose stop
    show_success "Containers stopped successfully!"
}

restart_containers() {
    show_header "Restarting Docker Containers"
    show_info "Restarting services..."
    docker compose restart
    show_success "Containers restarted successfully!"
    get_status
}

get_status() {
    show_header "Docker Containers Status"
    docker compose ps
    show_info "Recent logs (last 5 lines):"
    docker compose logs --tail 5
}

show_logs() {
    show_header "Docker Logs"
    if [ "$SERVICE" = "all" ]; then
        show_info "Showing logs from all services (last $LINES lines)..."
        docker compose logs --tail $LINES -f
    else
        show_info "Showing logs from $SERVICE service (last $LINES lines)..."
        docker compose logs --tail $LINES -f $SERVICE
    fi
}

access_app_shell() {
    show_header "Accessing App Container Shell"
    show_info "Connecting to app container..."
    docker compose exec app sh
}

access_db_shell() {
    show_header "Accessing Database Container Shell"
    show_info "Connecting to PostgreSQL container..."
    docker compose exec db psql -U admin -d admin_request_platform
}

build_image() {
    show_header "Building Docker Image"
    show_info "Building application image..."
    docker compose build
    show_success "Image built successfully!"
}

rebuild_everything() {
    show_header "Rebuilding Everything"
    show_info "Removing old containers and rebuilding..."
    docker compose down -v
    docker compose up -d --build

    show_success "Rebuild completed successfully!"
    show_info "Waiting for database to be ready..."
    sleep 5

    show_info "Running database migrations..."
    docker compose exec -T app npx prisma migrate deploy

    show_success "All services are ready!"
}

run_migrations() {
    show_header "Running Database Migrations"
    show_info "Executing Prisma migrations..."
    docker compose exec app npx prisma migrate deploy
    show_success "Migrations completed successfully!"
}

seed_database() {
    show_header "Seeding Database"
    show_info "Running database seed..."
    docker compose exec app npx prisma db seed
    show_success "Database seeded successfully!"
}

backup_database() {
    show_header "Backing Up Database"

    local timestamp=$(date +%Y-%m-%d_%H-%M-%S)
    local backup_file="backup_${timestamp}.sql"

    show_info "Creating backup: $backup_file"
    docker compose exec db pg_dump -U admin admin_request_platform > "$backup_file"
    show_success "Database backed up to: $backup_file"
}

reset_database() {
    show_header "Resetting Database"
    show_error "WARNING: This will DELETE all data!"

    read -p "Type 'yes' to confirm: " confirm

    if [ "$confirm" = "yes" ]; then
        show_info "Resetting database..."
        docker compose exec app npx prisma migrate reset --force
        show_success "Database reset successfully!"
    else
        show_info "Reset cancelled"
    fi
}

clean_docker() {
    show_header "Cleaning Up Docker Resources"
    show_error "WARNING: This will stop and remove all containers!"

    read -p "Type 'yes' to confirm: " confirm

    if [ "$confirm" = "yes" ]; then
        show_info "Stopping containers..."
        docker compose down -v
        show_success "Docker cleanup completed!"
        show_info "Running: docker system prune"
        docker system prune -f
        show_success "System prune completed!"
    else
        show_info "Cleanup cancelled"
    fi
}

# Main
COMMAND=${1:-help}
SERVICE=${2:-all}
LINES=${3:-50}

case "$COMMAND" in
    start)      start_containers ;;
    stop)       stop_containers ;;
    restart)    restart_containers ;;
    status)     get_status ;;
    logs)       show_logs ;;
    shell-app)  access_app_shell ;;
    shell-db)   access_db_shell ;;
    build)      build_image ;;
    rebuild)    rebuild_everything ;;
    migrate)    run_migrations ;;
    seed)       seed_database ;;
    backup)     backup_database ;;
    reset)      reset_database ;;
    clean)      clean_docker ;;
    *)
        echo "Admin Request Platform - Docker Management Script"
        echo ""
        echo "Usage: $0 <command> [options]"
        echo ""
        echo "Commands:"
        echo "  start       - Start all containers"
        echo "  stop        - Stop all containers"
        echo "  restart     - Restart all containers"
        echo "  status      - Show container status"
        echo "  logs        - Show container logs (optional: app|db|all, default: all)"
        echo "  shell-app   - Access app container shell"
        echo "  shell-db    - Access database shell"
        echo "  build       - Build Docker image"
        echo "  rebuild     - Rebuild everything from scratch"
        echo "  migrate     - Run database migrations"
        echo "  seed        - Seed database with initial data"
        echo "  backup      - Backup database to SQL file"
        echo "  reset       - Reset database (DELETE ALL DATA)"
        echo "  clean       - Clean up all containers and volumes"
        echo ""
        echo "Examples:"
        echo "  $0 start"
        echo "  $0 logs app"
        echo "  $0 logs db 100"
        ;;
esac
