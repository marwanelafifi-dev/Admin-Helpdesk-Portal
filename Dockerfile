# Production image that builds the app from source
FROM node:20-alpine

WORKDIR /app

# Install wget for health checks and netcat for db connectivity check
RUN apk add --no-cache wget netcat-openbsd

# Copy package files
COPY package*.json ./

# Disable strict SSL for npm install (corporate network issues)
RUN npm config set strict-ssl false && \
    npm ci --legacy-peer-deps && \
    npm config set strict-ssl true

# Copy prisma schema and generate client for Linux
COPY prisma/ ./prisma/
RUN NODE_TLS_REJECT_UNAUTHORIZED=0 npx prisma generate

# Copy source and build the production Next.js app inside Docker.
COPY . .
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_TLS_REJECT_UNAUTHORIZED=0 \
    NEXTAUTH_URL=http://localhost:3003 \
    NEXTAUTH_SECRET=docker-build-secret \
    DATABASE_URL=postgresql://admin:admin_password_123@db:5432/admin_request_platform
RUN npm run build

# Ensure cache directory exists with correct permissions
RUN mkdir -p .next/cache/images && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 && \
    chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null http://localhost:3003 || exit 1

COPY --chown=nextjs:nodejs docker-entrypoint.sh /app/
RUN chmod +x /app/docker-entrypoint.sh

ENTRYPOINT ["/app/docker-entrypoint.sh"]
