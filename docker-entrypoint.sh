#!/bin/sh

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
NODE_TLS_REJECT_UNAUTHORIZED=0 npx prisma generate 2>&1 | grep -v "Update available\|major update\|pris.ly\|npm i" || true

echo "Running Prisma migrations..."
NODE_TLS_REJECT_UNAUTHORIZED=0 npx prisma db push --skip-generate 2>&1 | grep -v "warn\|hint" || true

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
    else
      wget -q -O /dev/null \
        "http://localhost:3003/api/email/sync/cron" 2>/dev/null || true
    fi
    sleep 300
  done
) &

echo "✓ Starting application..."
exec node_modules/.bin/next start -p 3003
