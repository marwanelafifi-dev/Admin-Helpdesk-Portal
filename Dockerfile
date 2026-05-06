# Dockerfile - Minimal production image
# Requires: npm install && npm run build (done on host)

FROM node:20-alpine

WORKDIR /app

# Install wget for health checks
RUN apk add --no-cache wget

# Copy minimal required files
COPY package.json ./

# Only install production dependencies from existing lock file
RUN npm install --only=production --legacy-peer-deps

# Copy pre-built application
# Note: .next-dev is built locally and available in build context
ADD .next-dev/ ./.next-dev/
COPY public/ ./public/
COPY prisma/ ./prisma/

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
RUN chown -R nextjs:nodejs /app

USER nextjs

# Expose port
EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://localhost:3003 || exit 1

# Start the application
CMD ["npm", "start"]
