import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { ActivityType, ActorType } from "@/generated/prisma/enums";
import type { Db } from "@/lib/db/types";

export type ActivityEntry = {
  userId: string;
  collectionId?: string;
  clientSessionId?: string;
  actorType: ActorType;
  type: ActivityType;
  metadata?: Prisma.InputJsonValue;
};

export function logActivity(db: Db, entry: ActivityEntry) {
  return db.activityLog.create({ data: entry });
}
