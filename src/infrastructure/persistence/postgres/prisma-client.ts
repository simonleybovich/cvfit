import { PrismaClient } from "@prisma/client";

/**
 * Prisma singleton for the app's own Postgres (historial). Next.js Fast
 * Refresh re-evaluates modules on every edit in dev, which would otherwise
 * instantiate a fresh PrismaClient (and a fresh connection pool) per reload —
 * caching on `globalThis` survives across reloads. Standard pattern, see
 * https://www.prisma.io/docs/orm/more/help-and-troubleshooting/help-articles/nextjs-prisma-client-dev-practices.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
