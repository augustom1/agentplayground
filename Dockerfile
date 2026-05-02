# ─────────────────────────────────────────────
# Agent Dashboard — Multi-stage Docker build
# ─────────────────────────────────────────────
# Produces a lean image that auto-migrates the
# database on startup before serving the app.
#
# Build:  docker build -t agent-dashboard .
# Run:    docker run -p 3000:3000 --env-file .env.local agent-dashboard
# ─────────────────────────────────────────────

# ── Stage 1: Install dependencies ──────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ── Stage 2: Build the application ─────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build-time env vars (non-secret defaults)
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ── Stage 3: Production runner ─────────────
# Alpine is fine — Ollama runs as its own separate container (vps-ollama)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# su-exec: lets root entrypoint drop to nextjs for the actual process
# docker-cli: needed by Server Control page (runs docker ps / docker exec via execSync)
RUN apk add --no-cache su-exec docker-cli

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Copy standalone output + static assets
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy full node_modules — prisma CLI needs all its transitive deps (valibot etc.)
COPY --from=builder /app/node_modules    ./node_modules
COPY --from=builder /app/prisma          ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Create writable data directories
RUN mkdir -p /app/data/files /app/data/protocols && \
    chown -R nextjs:nodejs /app/data

# Copy entrypoint — runs as root so it can fix volume permissions at startup
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Entrypoint runs as root, drops to nextjs via su-exec after fixing permissions
EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
