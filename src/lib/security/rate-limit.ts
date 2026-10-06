import "server-only";
import { prisma } from "@/lib/db/prisma";
import { DomainError } from "@/services/errors";

/**
 * Fixed-window limiter backed by Postgres (one atomic upsert), so it works
 * across serverless instances without Redis.
 */
export async function consumeRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "rate_limit_bucket" ("key", "count", "resetAt")
    VALUES (${key}, 1, now() + make_interval(secs => ${windowSeconds}))
    ON CONFLICT ("key") DO UPDATE SET
      "count"   = CASE WHEN "rate_limit_bucket"."resetAt" < now() THEN 1 ELSE "rate_limit_bucket"."count" + 1 END,
      "resetAt" = CASE WHEN "rate_limit_bucket"."resetAt" < now() THEN now() + make_interval(secs => ${windowSeconds}) ELSE "rate_limit_bucket"."resetAt" END
    RETURNING "count"`;
  return (rows[0]?.count ?? 0) <= limit;
}

export async function enforceRateLimit(key: string, limit: number, windowSeconds: number) {
  if (!(await consumeRateLimit(key, limit, windowSeconds))) {
    throw new DomainError("RATE_LIMITED", "Muitas requisições em sequência. Aguarde um instante e tente de novo.");
  }
}
