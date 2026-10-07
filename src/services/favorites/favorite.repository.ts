import "server-only";
import type { Db } from "@/lib/db/types";

export function findReadyPhotoInCollection(db: Db, collectionId: string, photoId: string) {
  return db.photo.findFirst({ where: { id: photoId, collectionId, status: "READY" }, select: { id: true } });
}

/** Toggle inside one statement pair; the unique (session, photo) index makes it race-safe. */
export async function toggleFavoriteRow(db: Db, data: { collectionId: string; clientSessionId: string; photoId: string }) {
  const existing = await db.favorite.findUnique({
    where: { clientSessionId_photoId: { clientSessionId: data.clientSessionId, photoId: data.photoId } },
    select: { id: true },
  });
  if (existing) {
    await db.favorite.delete({ where: { id: existing.id } });
    return false;
  }
  await db.favorite.upsert({
    where: { clientSessionId_photoId: { clientSessionId: data.clientSessionId, photoId: data.photoId } },
    update: {},
    create: data,
  });
  return true;
}

export function countSessionFavorites(db: Db, clientSessionId: string) {
  return db.favorite.count({ where: { clientSessionId } });
}

export function listSessionFavoriteIds(db: Db, clientSessionId: string) {
  return db.favorite.findMany({ where: { clientSessionId }, select: { photoId: true } }).then((rows) => rows.map((r) => r.photoId));
}

/** Favourited READY photos of a session, in gallery order. */
export function listSessionFavoritePhotos(db: Db, clientSessionId: string) {
  return db.photo.findMany({
    where: { status: "READY", favorites: { some: { clientSessionId } } },
    orderBy: [{ gallery: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    select: { id: true, filename: true, originalFilename: true, width: true, height: true, dominantColor: true, thumbnailKey: true, previewKey: true },
  });
}

/** Submits (closes) the selection; false when it was already submitted — atomic, so a double click sends one e-mail. */
export async function submitSessionSelection(db: Db, clientSessionId: string, data: { clientName: string; clientEmail: string }) {
  const { count } = await db.clientSession.updateMany({ where: { id: clientSessionId, selectionSubmittedAt: null }, data: { ...data, selectionSubmittedAt: new Date() } });
  return count === 1;
}

/** Photographer reopens a submitted selection so the client can change it. */
export function reopenSessionSelection(db: Db, clientSessionId: string) {
  return db.clientSession.update({ where: { id: clientSessionId }, data: { selectionSubmittedAt: null }, select: { id: true } });
}

/** Photographer view: every session in a collection that has favourited something. */
export function listCollectionSelections(db: Db, collectionId: string) {
  return db.clientSession.findMany({
    where: { collectionId, favorites: { some: {} } },
    orderBy: [{ selectionSubmittedAt: { sort: "desc", nulls: "last" } }, { lastSeenAt: "desc" }],
    select: {
      id: true,
      clientName: true,
      clientEmail: true,
      selectionSubmittedAt: true,
      lastSeenAt: true,
      createdAt: true,
      _count: { select: { favorites: true } },
    },
  });
}

export function findOwnedClientSession(db: Db, userId: string, clientSessionId: string) {
  return db.clientSession.findFirst({
    where: { id: clientSessionId, collection: { userId } },
    select: { id: true, collectionId: true, clientName: true, clientEmail: true, selectionSubmittedAt: true },
  });
}

export function clearSessionFavorites(db: Db, clientSessionId: string) {
  return db.favorite.deleteMany({ where: { clientSessionId } });
}
