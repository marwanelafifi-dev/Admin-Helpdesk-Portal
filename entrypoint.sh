#!/bin/sh
set -e

# Ensure SWC cache directories exist with proper permissions
mkdir -p /app/node_modules/next/next-swc-fallback /app/.next/cache/swc
chmod -R 777 /app/node_modules/next/next-swc-fallback /app/.next/cache/swc

# Start Next.js server
exec node server.js
