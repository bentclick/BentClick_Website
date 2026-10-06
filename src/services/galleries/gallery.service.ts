import "server-only";
import { prisma } from "@/lib/db/prisma";
import { DomainError, NotFoundError } from "@/services/errors";
import { findOwnedCollection } from "@/services/collections/collection.repository";
import { countGalleries, deleteGalleryRow, findOwnedGallery, insertGallery, renameGallery } from "./gallery.repository";

export async function createGallery(userId: string, collectionId: string, name: string) {
  const collection = await findOwnedCollection(prisma, userId, collectionId);
  if (!collection) throw new NotFoundError("Collection");
  return insertGallery(prisma, collection.id, name);
}

export async function renameOwnedGallery(userId: string, galleryId: string, name: string) {
  const gallery = await findOwnedGallery(prisma, userId, galleryId);
  if (!gallery) throw new NotFoundError("Gallery");
  await renameGallery(prisma, gallery.id, name);
}

/** Only empty galleries can be removed, and a collection always keeps one. */
export async function deleteOwnedGallery(userId: string, galleryId: string) {
  const gallery = await findOwnedGallery(prisma, userId, galleryId);
  if (!gallery) throw new NotFoundError("Gallery");
  if (gallery.photoCount > 0) throw new DomainError("GALLERY_NOT_EMPTY", "Remova ou mova as fotos antes de excluir a galeria.");
  if ((await countGalleries(prisma, gallery.collectionId)) <= 1) {
    throw new DomainError("LAST_GALLERY", "A coleção precisa ter pelo menos uma galeria.");
  }
  await deleteGalleryRow(prisma, gallery.id);
  return { collectionId: gallery.collectionId };
}
