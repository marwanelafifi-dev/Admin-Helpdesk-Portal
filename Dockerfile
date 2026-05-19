FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache wget netcat-openbsd

# Install dependencies (full deps, including dev — we may need to build)
COPY package*.json ./
RUN npm config set strict-ssl false && \
    npm ci --legacy-peer-deps

# Generate Prisma client for Linux
COPY prisma/ ./prisma/
RUN NODE_TLS_REJECT_UNAUTHORIZED=0 npx prisma generate

# Copy all source. On Windows, .next-dev/ is pre-built locally and included via
# the build context (per CLAUDE.md Phase 4 — avoids gRPC EOF errors during in-container
# build with containerd snapshotter). On Linux, .next-dev/ doesn't exist yet — we
# build inside the container in the next step.
COPY . .

# If .next-dev was NOT shipped in the build context (Linux clean clone), build now.
# If it WAS shipped (Windows pre-built flow), skip — the existing output is used as-is.
RUN if [ ! -f .next-dev/BUILD_ID ]; then \
      echo "==> No pre-built .next-dev found — building inside container..."; \
      NODE_TLS_REJECT_UNAUTHORIZED=0 npm run build; \
    else \
      echo "==> Using pre-built .next-dev from build context."; \
    fi

RUN chmod +x ./docker-entrypoint.sh && \
    mkdir -p .next-dev/cache/images data

EXPOSE 3003

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

HEALTHCHECK --interval=30s --timeout=15s --start-period=90s --retries=5 \
  CMD wget -q -O /dev/null http://localhost:3003 || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
