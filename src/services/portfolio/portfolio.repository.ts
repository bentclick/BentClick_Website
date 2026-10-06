import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { Db } from "@/lib/db/types";

export function listAlbums(db: Db, userId: string) {
  return db.portfolioAlbum.findMany({
    where: { userId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      category: true,
      isPublished: true,
      updatedAt: true,
      _count: { select: { images: { where: { status: "READY" } } } },
      images: { where: { isCover: true, status: "READY" }, take: 1, select: { thumbnailKey: true, previewKey: true, dominantColor: true } },
    },
  });
}

export function findOwnedAlbum(db: Db, userId: string, albumId: string) {
  return db.portfolioAlbum.findFirst({ where: { id: albumId, userId } });
}

export function albumSlugTaken(db: Db, userId: string, slug: string, exceptId?: string) {
  return db.portfolioAlbum.count({ where: { userId, slug, ...(exceptId ? { id: { not: exceptId } } : {}) } }).then((n) => n > 0);
}

export async function insertAlbum(db: Db, data: Prisma.PortfolioAlbumUncheckedCreateInput) {
  const last = await db.portfolioAlbum.aggregate({ where: { userId: data.userId }, _max: { sortOrder: true } });
  return db.portfolioAlbum.create({ data: { ...data, sortOrder: (last._max.sortOrder ?? -1) + 1 }, select: { id: true } });
}

export function listAlbumImages(db: Db, albumId: string) {
  return db.portfolioImage.findMany({
    where: { albumId, status: { not: "PENDING_UPLOAD" } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, filename: true, status: true, width: true, height: true, fileSize: true, thumbnailKey: true, dominantColor: true, isCover: true },
  });
}

const imageSelect = {
  id: true,
  albumId: true,
  storageKey: true,
  previewKey: true,
  thumbnailKey: true,
  mimeType: true,
  fileSize: true,
  status: true,
  album: { select: { userId: true } },
} as const;

/** Images owned by `userId` through their album. */
export function findOwnedImages(db: Db, userId: string, imageIds: string[]) {
  return db.portfolioImage.findMany({ where: { id: { in: imageIds }, album: { userId } }, select: imageSelect });
}

export function nextImageOrder(db: Db, albumId: string) {
  return db.portfolioImage.aggregate({ where: { albumId }, _max: { sortOrder: true } }).then((r) => (r._max.sortOrder ?? -1) + 1);
}
