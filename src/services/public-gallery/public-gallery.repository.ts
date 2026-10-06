import "server-only";
import type { Db } from "@/lib/db/types";

/** Everything the public gallery needs about a collection, looked up by its share slug. */
export function findCollectionBySlug(db: Db, slug: string) {
  return db.collection.findUnique({
    where: { slug },
    select: {
      id: true,
      userId: true,
      slug: true,
      title: true,
      eventDate: true,
      status: true,
      linkEnabled: true,
      expiresAt: true,
      passwordHash: true,
      accessVersion: true,
      allowFavorites: true,
      allowIndividualDownload: true,
      allowFullDownload: true,
      allowSharing: true,
      requireClientIdentity: true,
      downloadQuality: true,
      layout: true,
      coverPhoto: { select: { previewKey: true, dominantColor: true, status: true } },
      user: { select: { name: true, profile: { select: { brandName: true, accentColor: true } } } },
    },
  });
}

export type PublicCollectionRow = NonNullable<Awaited<ReturnType<typeof findCollectionBySlug>>>;

/** Galleries that actually have something to show, in the photographer's order. */
export function listVisibleGalleries(db: Db, collectionId: string) {
  return db.gallery.findMany({
    where: { collectionId, photos: { some: { status: "READY" } } },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, _count: { select: { photos: { where: { status: "READY" } } } } },
  });
}

/** Cursor-paged READY photos; clients never see pending, failed or RAW-only files. */
export function listReadyPhotos(db: Db, collectionId: string, galleryId: string, take: number, cursor?: string) {
  return db.photo.findMany({
    where: { collectionId, galleryId, status: "READY" },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: { id: true, filename: true, width: true, height: true, dominantColor: true, thumbnailKey: true, previewKey: true },
  });
}

export function findClientSession(db: Db, collectionId: string, tokenHash: string) {
  return db.clientSession.findUnique({
    where: { tokenHash },
    select: { id: true, collectionId: true, accessVersion: true, passwordOk: true, expiresAt: true, clientName: true, clientEmail: true },
  }).then((s) => (s && s.collectionId === collectionId ? s : null));
}

export function createClientSession(
  db: Db,
  data: { collectionId: string; tokenHash: string; accessVersion: number; passwordOk: boolean; expiresAt: Date; userAgent?: string; ipHash?: string },
) {
  return db.clientSession.create({ data, select: { id: true } });
}

export function markCollectionExpired(db: Db, collectionId: string) {
  return db.collection.updateMany({ where: { id: collectionId, status: "PUBLISHED" }, data: { status: "EXPIRED" } });
}

export function touchCollectionAccess(db: Db, collectionId: string) {
  return db.collection.update({ where: { id: collectionId }, data: { lastAccessedAt: new Date() }, select: { id: true } });
}
