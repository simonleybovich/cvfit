# syntax=docker/dockerfile:1

FROM node:22-alpine AS base

# --- deps: install dependencies only (cached across builds unless lockfile/schema change) ---
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# --- builder: full source + build ---
FROM base AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build-time-only placeholders: nothing in this app reads real secrets during
# `next build` (route handlers read env at request time), but Next.js still
# needs these vars *present* to avoid failing on undefined access during
# static analysis/page data collection. Real values are injected at runtime
# by Dokploy, not baked into the image.
ENV NEXT_TELEMETRY_DISABLED=1
ENV GEMINI_API_KEY=build-placeholder
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV NEXT_PUBLIC_SUPABASE_URL=https://build-placeholder.supabase.co
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=build-placeholder
RUN npm run build

# --- runner: minimal production image ---
FROM base AS runner
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
