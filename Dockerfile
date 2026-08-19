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

# NEXT_PUBLIC_* vars are inlined into the client JS bundle at build time, not
# read at container runtime — a runtime env var can't fix a wrong value here.
# Real values must come in as Docker build args (safe: these two are already
# meant to be public/client-exposed, unlike GEMINI_API_KEY below).
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

ENV NEXT_TELEMETRY_DISABLED=1
# Server-only vars are read from process.env at request time, never inlined
# into the client bundle — a build-time placeholder is fine here, it only
# needs to be *present* so Next.js doesn't fail on undefined access during
# static analysis/page data collection. Real values are injected at runtime
# by Dokploy for these two.
ENV GEMINI_API_KEY=build-placeholder
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
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
# @prisma/adapter-pg is now a runtime dependency (Prisma 7's PrismaClient
# requires an explicit driver adapter, see prisma-client.ts) rather than a
# generator-only artifact, but Next's standalone output tracing didn't pick
# it up at all, and only stubbed a package.json (no index.js) for its
# top-level postgres-array dependency — copying the full untraced @prisma
# scope and postgres-array from the builder's node_modules like the .prisma
# line above fixes both.
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/postgres-array ./node_modules/postgres-array

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
