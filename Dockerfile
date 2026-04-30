# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
WORKDIR /app

# Per project instruction: ignore package-lock.json (use npm install instead of npm ci)
COPY package.json ./
RUN npm install

FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next-dev ./.next-dev
COPY --from=builder /app/public ./public

EXPOSE 3003
CMD ["npm", "start"]

