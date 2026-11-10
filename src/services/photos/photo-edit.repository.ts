import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { Db } from "@/lib/db/types";

/** Ownership lives in the query: a photo of another account simply isn't found. */
export function findEditablePhoto(db: Db, userId: string, photoId: string) {
  return db.photo.findFirst({
    where: { id: photoId, userId },
    select: {
      id: true,
      userId: true,
      collectionId: true,
      galleryId: true,
      status: true,
      storageKey: true,
      mimeType: true,
      originalFilename: true,
      previewKey: true,
      thumbnailKey: true,
      editedKey: true,
      editedFileSize: true,
      pendingEdit: true,
    },
  });
}

export type EditablePhoto = NonNullable<Awaited<ReturnType<typeof findEditablePhoto>>>;

export function savePendingEdit(db: Db, photoId: string, pending: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput) {
  return db.photo.update({ where: { id: photoId }, data: { pendingEdit: pending } });
}

/** Compare-and-set on the current edit: of two simultaneous requests, only one wins. */
export function swapEditedVersion(db: Db, photo: EditablePhoto, data: Prisma.PhotoUpdateManyMutationInput) {
  return db.photo.updateMany({ where: { id: photo.id, userId: photo.userId, editedKey: photo.editedKey }, data });
}

type DevelopScope = { galleryId?: string; photoIds?: string[] };

const developable = (userId: string, collectionId: string, scope: DevelopScope): Prisma.PhotoWhereInput => ({
  userId,
  collectionId,
  status: "READY",
  ...(scope.galleryId ? { galleryId: scope.galleryId } : {}),
  ...(scope.photoIds ? { id: { in: scope.photoIds } } : {}),
});

/** Ready photos of one of the owner's collections, in grid order, optionally narrowed to a gallery or to given ids. */
export async function findDevelopablePhotos(db: Db, userId: string, collectionId: string, scope: DevelopScope, take: number) {
  const where = developable(userId, collectionId, scope);
  const [rows, total] = await Promise.all([
    db.photo.findMany({ where, orderBy: [{ gallery: { sortOrder: "asc" } }, { sortOrder: "asc" }, { createdAt: "asc" }], take, select: { id: true, originalFilename: true } }),
    db.photo.count({ where }),
  ]);
  return { rows, total };
}

export function findOwnedCollectionTitle(db: Db, userId: string, collectionId: string) {
  return db.collection.findFirst({ where: { id: collectionId, userId }, select: { id: true, title: true } });
}
