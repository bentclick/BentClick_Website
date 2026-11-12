import "server-only";
import { prisma } from "@/lib/db/prisma";
import { DomainError } from "@/services/errors";

/**
 * Fixed-window limiter backed by Postgres (one atomic upsert), so it works
 * across serverless instances without Redis.
 */
export async function consumeRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  return (await consumeRateLimitWindow(key, limit, windowSeconds)).allowed;
}

/** Same atomic step, also reporting how long until the window frees up (for 429 Retry-After). */
export async function consumeRateLimitWindow(key: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; retryAfter: number | null; count: number }> {
  const rows = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
    INSERT INTO "rate_limit_bucket" ("key", "count", "resetAt")
    VALUES (${key}, 1, now() + make_interval(secs => ${windowSeconds}))
    ON CONFLICT ("key") DO UPDATE SET
      "count"   = CASE WHEN "rate_limit_bucket"."resetAt" < now() THEN 1 ELSE "rate_limit_bucket"."count" + 1 END,
      "resetAt" = CASE WHEN "rate_limit_bucket"."resetAt" < now() THEN now() + make_interval(secs => ${windowSeconds}) ELSE "rate_limit_bucket"."resetAt" END
    RETURNING "count", "resetAt"`;
  const row = rows[0];
  if (!row || row.count <= limit) return { allowed: true, retryAfter: null, count: row?.count ?? 1 };
  return { allowed: false, retryAfter: Math.max(1, Math.ceil((row.resetAt.getTime() - Date.now()) / 1000)), count: row.count };
}

/** Gives back one use of the window (an attempt counted up front that turned out to be legitimate). */
export async function refundRateLimit(key: string): Promise<void> {
  await prisma.$executeRaw`UPDATE "rate_limit_bucket" SET "count" = GREATEST("count" - 1, 0) WHERE "key" = ${key} AND "resetAt" >= now()`;
}

/** Read-only check: has this key already used up its window? (Pair with consumeRateLimit on failure.) */
export async function isRateLimited(key: string, limit: number): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    SELECT "count" FROM "rate_limit_bucket" WHERE "key" = ${key} AND "resetAt" >= now()`;
  return (rows[0]?.count ?? 0) >= limit;
}

export async function enforceRateLimit(key: string, limit: number, windowSeconds: number) {
  if (!(await consumeRateLimit(key, limit, windowSeconds))) {
    throw new DomainError("RATE_LIMITED", "Muitas requisições em sequência. Aguarde um instante e tente de novo.");
  }
}
