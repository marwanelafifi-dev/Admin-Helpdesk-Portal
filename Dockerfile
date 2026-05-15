FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache wget netcat-openbsd

COPY package*.json ./
RUN npm config set strict-ssl false && \
    npm ci --legacy-peer-deps --omit=dev

COPY prisma/ ./prisma/
RUN NODE_TLS_REJECT_UNAUTHORIZED=0 npx prisma generate

COPY .next-dev/ ./.next-dev/
COPY public/ ./public/
COPY data/ ./data/
COPY scripts/ ./scripts/
COPY next.config.ts ./next.config.ts
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh && \
    mkdir -p .next-dev/cache/images data

EXPOSE 3003

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

HEALTHCHECK --interval=30s --timeout=15s --start-period=90s --retries=5 \
  CMD wget -q -O /dev/null http://localhost:3003 || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
