import "server-only";
import type { Db } from "@/lib/db/types";

export function listClientsForUser(db: Db, userId: string) {
  return db.client.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      _count: { select: { collections: true } },
    },
  });
}

export function findOwnedClient(db: Db, userId: string, clientId: string) {
  return db.client.findFirst({ where: { id: clientId, userId }, select: { id: true, email: true } });
}

export function findClientByEmail(db: Db, userId: string, email: string) {
  return db.client.findUnique({ where: { userId_email: { userId, email } }, select: { id: true } });
}

export function createClient(db: Db, data: { userId: string; name: string; email: string | null }) {
  return db.client.create({ data, select: { id: true } });
}
