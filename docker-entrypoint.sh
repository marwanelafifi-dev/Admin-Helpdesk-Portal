#!/bin/sh
set -eu

# Ensure required data directories exist with proper permissions
mkdir -p /app/data/backups
mkdir -p /app/data/attachments
chmod 755 /app/data /app/data/backups /app/data/attachments
chown -R node:node /app/data /app/.next-dev 2>/dev/null || true

echo "Waiting for database to be ready..."
max_attempts=60
attempt=1

while [ $attempt -le $max_attempts ]; do
  if nc -z db 5432 2>/dev/null; then
    echo "✓ Database is ready!"
    break
  fi
  sleep 1
  attempt=$((attempt + 1))
done

if [ $attempt -gt $max_attempts ]; then
  echo "✗ Database failed to respond"
  exit 1
fi

echo "Generating Prisma client for Linux..."
npx prisma generate

echo "Running Prisma migrations..."
if [ "${PRISMA_MIGRATION_MODE:-deploy}" = "push" ]; then
  # Local development only: supports databases created before migration
  # history was introduced. Production keeps the safe `migrate deploy`
  # default and must never use schema push.
  npx prisma db push --skip-generate
else
  npx prisma migrate deploy
fi

# Start email reply sync cron in background (every 5 minutes)
# Waits 30s for the app to fully boot before first poll
(
  sleep 30
  echo "✓ Email reply sync cron started (every 5 minutes)"
  CRON_SECRET="${INBOUND_EMAIL_SECRET:-}"
  while true; do
    if [ -n "$CRON_SECRET" ]; then
      wget -q -O /dev/null \
        --header="x-cron-secret: $CRON_SECRET" \
        "http://localhost:3003/api/email/sync/cron" 2>/dev/null || true
    fi
    sleep 300
  done
) &

echo "✓ Starting application..."
exec su-exec node node_modules/.bin/next start -p 3003
