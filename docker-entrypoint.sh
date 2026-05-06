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

echo "✓ Starting application..."
exec npm start
