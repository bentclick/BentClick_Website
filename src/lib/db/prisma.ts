import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * pg warns on every connection that sslmode=prefer|require|verify-ca will change meaning
 * in its next major version. Opting into libpq semantics keeps today's behaviour
 * (encrypted connection, as the provider's URL asks) and silences the warning.
 */
export function withLibpqSslMode(url: string | undefined): string | undefined {
  if (!url || !/[?&]sslmode=(prefer|require|verify-ca)(&|$)/.test(url) || /[?&]uselibpqcompat=/.test(url)) return url;
  return `${url}&uselibpqcompat=true`;
}

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: withLibpqSslMode(process.env.DATABASE_URL) });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

// Reuse one client across hot reloads in development.
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
