import type { Prisma, PrismaClient } from "@/generated/prisma/client";

/** Repositories accept either the root client or an interactive-transaction client. */
export type Db = PrismaClient | Prisma.TransactionClient;
