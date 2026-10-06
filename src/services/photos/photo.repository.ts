import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { Db } from "@/lib/db/types";

export function nextSortOrder(db: Db, galleryId: string) {
  return db.photo
    .aggregate({ where: { galleryId }, _max: { sortOrder: true } })
    .then((r) => (r._max.sortOrder ?? -1) + 1);
}

export function insertPendingPhotos(db: Db, rows: Prisma.PhotoCreateManyInput[]) {
  return db.photo.createMany({ data: rows });
}

/** Photos owned by `userId`, in a given state — every browser-supplied id goes through this. */
export function findOwnedPhotos(db: Db, userId: string, photoIds: string[], status?: Prisma.PhotoWhereInput["status"]) {
  return db.photo.findMany({
    where: { id: { in: photoIds }, userId, ...(status ? { status } : {}) },
    select: {
      id: true,
      collectionId: true,
      galleryId: true,
      storageKey: true,
      previewKey: true,
      thumbnailKey: true,
      mimeType: true,
      fileSize: true,
      filename: true,
      status: true,
    },
  });
}

export function markUploaded(db: Db, photoId: string) {
  return db.photo.updateMany({ where: { id: photoId, status: "PENDING_UPLOAD" }, data: { status: "UPLOADED" } });
}

/** Atomic claim: only one invocation can move a photo into PROCESSING. */
export function claimForProcessing(db: Db, photoId: string, userId: string) {
  return db.photo.updateMany({
    where: { id: photoId, userId, status: { in: ["UPLOADED", "FAILED"] } },
    data: { status: "PROCESSING", failureReason: null },
  });
}

export function findPhotoForProcessing(db: Db, photoId: string) {
  return db.photo.findUnique({
    where: { id: photoId },
    select: { id: true, userId: true, collectionId: true, storageKey: true, mimeType: true },
  });
}

export function updatePhoto(db: Db, photoId: string, data: Prisma.PhotoUpdateInput) {
  return db.photo.update({ where: { id: photoId }, data });
}

export function adjustCounters(db: Db, collectionId: string, galleryId: string, photos: number, bytes: bigint) {
  return Promise.all([
    db.collection.update({ where: { id: collectionId }, data: { photoCount: { increment: photos }, totalBytes: { increment: bytes } } }),
    db.gallery.update({ where: { id: galleryId }, data: { photoCount: { increment: photos } } }),
  ]);
}

export function listGalleryPhotos(db: Db, galleryId: string, take: number) {
  return db.photo.findMany({
    where: { galleryId, status: { not: "PENDING_UPLOAD" } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    take,
    select: {
      id: true,
      filename: true,
      status: true,
      width: true,
      height: true,
      fileSize: true,
      thumbnailKey: true,
      dominantColor: true,
      failureReason: true,
      isFeatured: true,
      mimeType: true,
    },
  });
}

export function deletePhotoRows(db: Db, photoIds: string[]) {
  return db.photo.deleteMany({ where: { id: { in: photoIds } } });
}
