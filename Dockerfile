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

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Copy standalone output + static assets
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy full node_modules — prisma CLI needs all its transitive deps (valibot etc.)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma       ./prisma

# Copy entrypoint and make it executable (must happen before USER switch)
COPY --chown=nextjs:nodejs entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER nextjs

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
