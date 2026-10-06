import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { CollectionStatus } from "@/generated/prisma/enums";
import type { Db } from "@/lib/db/types";
import type { CollectionFilters } from "@/lib/validation/collection";

const DAY_MS = 24 * 60 * 60 * 1000;
export const COLLECTION_PAGE_SIZE = 60;

/** Translates list filters into a Prisma where clause, always scoped to the owner. */
function buildListWhere(userId: string, filters: CollectionFilters, now: Date): Prisma.CollectionWhereInput {
  const and: Prisma.CollectionWhereInput[] = [{ userId }];

  if (filters.q) {
    and.push({
      OR: [
        { title: { contains: filters.q, mode: "insensitive" } },
        { client: { name: { contains: filters.q, mode: "insensitive" } } },
        { client: { email: { contains: filters.q, mode: "insensitive" } } },
      ],
    });
  }

  // Status filters use the *effective* status (published-but-past-expiry = expired).
  switch (filters.status) {
    case "PUBLISHED":
      and.push({ status: "PUBLISHED", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] });
      break;
    case "EXPIRED":
      and.push({ OR: [{ status: "EXPIRED" }, { status: "PUBLISHED", expiresAt: { lte: now } }] });
      break;
    case "DRAFT":
    case "ARCHIVED":
      and.push({ status: filters.status });
      break;
    default:
      and.push({ status: { not: "ARCHIVED" } });
  }

  if (filters.category !== "all") and.push({ category: filters.category });
  if (filters.expiring !== "any") {
    and.push({ expiresAt: { gt: now, lte: new Date(now.getTime() + Number(filters.expiring) * DAY_MS) } });
  }
  if (filters.favorites === "with") and.push({ favorites: { some: {} } });

  // Event dates are calendar dates; compare against UTC midnight today.
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  switch (filters.eventPeriod) {
    case "upcoming":
      and.push({ eventDate: { gte: today } });
      break;
    case "last30":
    case "last90":
      and.push({ eventDate: { gte: new Date(today.getTime() - (filters.eventPeriod === "last30" ? 30 : 90) * DAY_MS), lt: today } });
      break;
    case "year":
      and.push({ eventDate: { gte: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)), lt: new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1)) } });
      break;
  }

  return { AND: and };
}

function buildListOrder(sort: CollectionFilters["sort"]): Prisma.CollectionOrderByWithRelationInput[] {
  switch (sort) {
    case "event":
      return [{ eventDate: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }];
    case "expires":
      return [{ expiresAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }];
    case "title":
      return [{ title: "asc" }];
    default:
      return [{ updatedAt: "desc" }];
  }
}

export function listCollectionsForUser(db: Db, userId: string, filters: CollectionFilters, now: Date) {
  return db.collection.findMany({
    where: buildListWhere(userId, filters, now),
    orderBy: buildListOrder(filters.sort),
    take: COLLECTION_PAGE_SIZE,
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      category: true,
      eventDate: true,
      expiresAt: true,
      photoCount: true,
      updatedAt: true,
      client: { select: { name: true } },
      coverPhoto: { select: { thumbnailKey: true, previewKey: true, dominantColor: true } },
      _count: { select: { favorites: true } },
    },
  });
}

export function countCollectionsForUser(db: Db, userId: string) {
  return db.collection.count({ where: { userId } });
}

export type CollectionListRow = Awaited<ReturnType<typeof listCollectionsForUser>>[number];

export function findOwnedCollection(db: Db, userId: string, collectionId: string) {
  return db.collection.findFirst({ where: { id: collectionId, userId } });
}

export function findOwnedCollectionForEditor(db: Db, userId: string, collectionId: string) {
  return db.collection.findFirst({
    where: { id: collectionId, userId },
    include: {
      client: { select: { id: true, name: true, email: true } },
      coverPhoto: { select: { previewKey: true, thumbnailKey: true, dominantColor: true } },
      galleries: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true, photoCount: true } },
    },
  });
}

export function countSelections(db: Db, collectionId: string) {
  return db.clientSession.count({ where: { collectionId, favorites: { some: {} } } });
}

export function slugExists(db: Db, slug: string) {
  return db.collection.count({ where: { slug } }).then((count) => count > 0);
}

export function countReadyPhotos(db: Db, collectionId: string) {
  return db.photo.count({ where: { collectionId, status: "READY" } });
}

export function insertCollection(db: Db, data: Prisma.CollectionUncheckedCreateInput) {
  return db.collection.create({ data, select: { id: true } });
}

export function updateCollectionStatus(
  db: Db,
  collectionId: string,
  data: { status: CollectionStatus; publishedAt?: Date | null; archivedAt?: Date | null },
) {
  return db.collection.update({ where: { id: collectionId }, data, select: { id: true, status: true } });
}

export function deleteCollectionRow(db: Db, collectionId: string) {
  return db.collection.delete({ where: { id: collectionId } });
}

export function findOwnedWatermarkId(db: Db, userId: string, watermarkId: string) {
  return db.watermark.findFirst({ where: { id: watermarkId, userId }, select: { id: true } });
}
