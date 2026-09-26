# ==============================================================================
# ONIX APPAREL - Production Dockerfile for Google Cloud Run
# Multi-stage container build with Vite SPA builder and minimal Node.js runtime.
# ==============================================================================

# Stage 1: Build the Vite Frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Install all dependencies (including devDependencies for tsc and vite)
COPY package*.json ./
RUN npm ci

# Copy project source
COPY . .

# Compile TypeScript and bundle Vite SPA -> /app/dist
RUN npm run build

# Stage 2: Lightweight Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

# Non-root user security best practice for Cloud Run
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

ENV NODE_ENV=production
ENV PORT=8080

# Copy necessary production artifacts
COPY package*.json ./
COPY --from=builder /app/dist ./dist
COPY server/ ./server/
COPY vertex-retail-catalog.json* ./
COPY openapi.yaml ./
COPY public/ ./public/

# Set file ownership
RUN chown -R appuser:appgroup /app

USER appuser

# Cloud Run defaults to port 8080
EXPOSE 8080

# Starts the unified Node.js proxy and static SPA server
CMD ["node", "server/proxy.mjs"]
