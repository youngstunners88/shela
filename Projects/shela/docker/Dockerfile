# Shela Dating Safety Protocol
# Production Dockerfile

FROM node:20-alpine AS base

# Install dependencies
RUN apk add --no-cache libc6-compat python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# ============== BUILDER ==============
FROM base AS builder

COPY . .
RUN npm run build

# ============== PRODUCTION ==============
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S shela -u 1001

# Copy built app
COPY --from=builder --chown=shela:nodejs /app/dist ./dist
COPY --from=builder --chown=shela:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=shela:nodejs /app/package.json ./package.json

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

USER shela

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "dist/server.js"]
