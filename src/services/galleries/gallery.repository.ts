import "server-only";
import type { Db } from "@/lib/db/types";

/** A gallery the user owns, via its collection. */
export function findOwnedGallery(db: Db, userId: string, galleryId: string) {
  return db.gallery.findFirst({
    where: { id: galleryId, collection: { userId } },
    select: { id: true, collectionId: true, name: true, photoCount: true },
  });
}

export async function insertGallery(db: Db, collectionId: string, name: string) {
  const last = await db.gallery.aggregate({ where: { collectionId }, _max: { sortOrder: true } });
  return db.gallery.create({
    data: { collectionId, name, sortOrder: (last._max.sortOrder ?? -1) + 1 },
    select: { id: true },
  });
}

export function renameGallery(db: Db, galleryId: string, name: string) {
  return db.gallery.update({ where: { id: galleryId }, data: { name } });
}

export function deleteGalleryRow(db: Db, galleryId: string) {
  return db.gallery.delete({ where: { id: galleryId } });
}

export function countGalleries(db: Db, collectionId: string) {
  return db.gallery.count({ where: { collectionId } });
}
