import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

/**
 * Prisma 7 requires an explicit driver adapter for the runtime client (no
 * more implicit connection off schema.prisma's datasource url — see
 * prisma.config.ts and prisma/schema.prisma for the CLI/Migrate side of this
 * same 6->7 upgrade). https://pris.ly/d/prisma7-client-config
 */
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

/**
 * Prisma singleton for the app's own Postgres (historial). Next.js Fast
 * Refresh re-evaluates modules on every edit in dev, which would otherwise
 * instantiate a fresh PrismaClient (and a fresh connection pool) per reload —
 * caching on `globalThis` survives across reloads. Standard pattern, see
 * https://www.prisma.io/docs/orm/more/help-and-troubleshooting/help-articles/nextjs-prisma-client-dev-practices.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
