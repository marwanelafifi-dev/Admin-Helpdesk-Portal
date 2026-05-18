# syntax=docker/dockerfile:1

# Build stage: compile Next.js and dependencies
FROM node:22-alpine AS builder

WORKDIR /app

# Disable SSL verification only during build for corporate proxy environments
# This is NOT carried into the runtime image
ARG NODE_TLS_REJECT_UNAUTHORIZED=0
ENV NODE_TLS_REJECT_UNAUTHORIZED=${NODE_TLS_REJECT_UNAUTHORIZED}

# Force Prisma to use binary engine instead of WASM (required for Alpine Linux)
ENV PRISMA_CLI_QUERY_ENGINE_TYPE=binary
ENV PRISMA_CLIENT_ENGINE_TYPE=binary

# Install build dependencies
RUN apk add --no-cache python3 make g++ openssl

# Copy package files first for layer caching
COPY package.json package-lock.json ./

# Copy prisma schema before npm install so @prisma/client generates correctly
COPY prisma ./prisma

# Configure npm to skip SSL verification and install dependencies
RUN npm config set strict-ssl false && \
    npm ci --legacy-peer-deps && \
    npm install @prisma/client --legacy-peer-deps && \
    npm cache clean --force

# Generate Prisma client after node_modules are installed
RUN npx prisma generate

# Copy source code
COPY . .

# Provide a placeholder DATABASE_URL so Next.js route imports don't throw at
# build time. Prisma only connects when a query runs, so this never hits the DB.
ARG DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV DATABASE_URL=${DATABASE_URL}

# Build Next.js application with standalone output
RUN npm run build

# Runtime stage: minimal production image
FROM node:22-alpine

WORKDIR /app

# Install only runtime dependencies
RUN apk add --no-cache libc6-compat openssl dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Copy built application from builder (standalone includes all dependencies)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY entrypoint.sh /app/entrypoint.sh

RUN chmod +x /app/entrypoint.sh && \
    mkdir -p /app/node_modules/next/next-swc-fallback /app/.next/cache /app/.next/cache/swc && \
    chmod -R 755 /app && \
    chown -R nextjs:nodejs /app

USER nextjs

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3003
ENV HOSTNAME=0.0.0.0
ENV NEXT_SKIP_SWC_FALLBACK=1

EXPOSE 3003

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--", "/app/entrypoint.sh"]
CMD []
