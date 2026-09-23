FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache wget netcat-openbsd su-exec

# Install dependencies (full deps, including dev — we may need to build)
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Generate Prisma client for Linux
COPY prisma/ ./prisma/
RUN npx prisma generate

# Copy all source. On Windows, .next-dev/ is pre-built locally and included via
# the build context (per CLAUDE.md Phase 4 — avoids gRPC EOF errors during in-container
# build with containerd snapshotter). On Linux, .next-dev/ doesn't exist yet — we
# build inside the container in the next step.
COPY . .

# `next build` validates auth config at build time and requires AUTH_SECRET.
# It also evaluates a few module-level reads of env vars in API routes.
# We pass them through as build args so the in-container build succeeds.
# These are NOT secrets at build time — they're the same values used at runtime,
# read from .env.local via the docker-compose build args block.
# If .next-dev was NOT shipped in the build context (Linux clean clone), build now.
# If it WAS shipped (Windows pre-built flow), skip — the existing output is used as-is.
RUN if [ ! -f .next-dev/BUILD_ID ]; then \
      echo "==> No pre-built .next-dev found — building inside container..."; \
      AUTH_SECRET=build-time-placeholder-that-is-never-used-at-runtime NEXTAUTH_SECRET=build-time-placeholder-that-is-never-used-at-runtime npm run build; \
    else \
      echo "==> Using pre-built .next-dev from build context."; \
    fi

RUN sed -i 's/\r$//' ./docker-entrypoint.sh && \
    chmod +x ./docker-entrypoint.sh && \
    mkdir -p .next-dev/cache/images data && \
    # Only runtime-writable directories need to be owned by the unprivileged
    # process. Recursively chowning all of /app also walks node_modules and
    # makes Windows-hosted Docker builds needlessly slow.
    chown -R node:node /app/.next-dev /app/data

EXPOSE 3003

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

HEALTHCHECK --interval=30s --timeout=15s --start-period=90s --retries=5 \
  CMD nc -z localhost 3003 || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
