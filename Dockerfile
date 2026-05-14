# Production image — builds Next.js app from source
FROM node:20-alpine

WORKDIR /app

# Install health-check and DB-readiness tools
RUN apk add --no-cache wget netcat-openbsd || apk add --no-cache wget

# Copy package files and install dependencies
COPY package*.json ./
RUN npm config set strict-ssl false && \
    npm ci --legacy-peer-deps && \
    npm config set strict-ssl true

# Generate Prisma client for Linux
COPY prisma/ ./prisma/
RUN NODE_TLS_REJECT_UNAUTHORIZED=0 npx prisma generate

# Copy all source and build
COPY . .
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_TLS_REJECT_UNAUTHORIZED=0 \
    NEXTAUTH_URL=http://localhost:3003 \
    NEXTAUTH_SECRET=docker-build-secret \
    DATABASE_URL=postgresql://admin:admin_password_123@db:5432/admin_request_platform
RUN npm run build

# Create non-root user and set permissions on output dirs only
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 && \
    mkdir -p .next/cache/images data && \
    chown -R nextjs:nodejs .next data

# Copy entrypoint BEFORE switching to non-root user
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh && \
    chown nextjs:nodejs /app/docker-entrypoint.sh

USER nextjs

EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -q -O /dev/null http://localhost:3003 || exit 1

ENTRYPOINT ["/app/docker-entrypoint.sh"]
