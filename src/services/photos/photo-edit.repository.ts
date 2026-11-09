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
