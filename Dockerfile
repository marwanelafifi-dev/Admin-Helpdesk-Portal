# syntax=docker/dockerfile:1

# Single-stage Dockerfile for external build strategy
FROM node:20-alpine

WORKDIR /app

# Install runtime dependencies only
RUN apk add --no-cache libc6-compat openssl

# Copy everything from local build
COPY . .

# Ensure node_modules has proper permissions for runtime
RUN chown -R root:root /app/node_modules || true

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3003
ENV HOSTNAME=0.0.0.0

EXPOSE 3003

CMD ["npm", "run", "start"]
