// Prisma 7's config model: CLI/Migrate connection settings move here instead
// of `datasource { url = env("DATABASE_URL") }` in schema.prisma (see
// https://pris.ly/d/config-datasource). This file is read by the `prisma`
// CLI (generate/migrate/studio) only — it does not affect the runtime
// PrismaClient, which gets its connection via the driver adapter constructed
// in src/infrastructure/persistence/postgres/prisma-client.ts.
//
// Prisma 7 no longer auto-loads .env files for the CLI (removed in the 6->7
// upgrade), so it's loaded explicitly here. Mirrors Next.js's own env
// precedence (README.md setup step 2): `.env` first, then `.env.local`
// overriding it, so either file (or both) works for `npm run db:*`.
import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

config();
config({ path: ".env.local", override: true });

type Env = {
  DATABASE_URL: string;
};

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env<Env>("DATABASE_URL"),
  },
});
