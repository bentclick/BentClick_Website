import "server-only";
import type { Db } from "@/lib/db/types";

export function findProfileByUserId(db: Db, userId: string) {
  return db.photographerProfile.findUnique({ where: { userId } });
}

export function upsertProfile(db: Db, userId: string, brandName: string) {
  return db.photographerProfile.upsert({
    where: { userId },
    update: {},
    create: { userId, brandName },
  });
}
