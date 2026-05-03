#!/bin/bash

# Local Build Script for External Docker Build Strategy
# This script runs all build commands on the host machine to bypass network/TLS issues

echo "🔨 Starting local build process..."

echo "📦 Installing dependencies..."
npm install

echo "🗄️ Generating Prisma client..."
npx prisma generate

echo "🏗️ Building Next.js application..."
npm run build

echo "✅ Local build completed successfully!"
echo ""
echo "🐳 Now you can run: docker-compose up -d --build"
echo "This will package the already-built files into the Docker container."
