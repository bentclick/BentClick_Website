import "server-only";
import { prisma } from "@/lib/db/prisma";
import { MAX_DEVELOP_BATCH, type OpenedPhoto, withOpenNames } from "@/lib/develop/develop-batch";
import { NotFoundError } from "@/services/errors";
import { findDevelopablePhotos, findEditablePhoto, findOwnedCollectionTitle } from "./photo-edit.repository";


/**
 * `sourceUrl` is the owner's download route, which signs a fresh link on each call: a batch is fetched one photo
 * after another and can outlast a link signed up front (10 minutes).
 */
export type DevelopPhoto = OpenedPhoto<{ photoId: string; filename: string; sourceUrl: string }>;
export type DevelopSession = { collectionId: string; title: string; photos: DevelopPhoto[]; total: number };

const toPhoto = (p: { id: string; originalFilename: string }) => ({ photoId: p.id, filename: p.originalFilename, sourceUrl: `/api/photos/${p.id}/download` });

/** One photo, from its "Revelar no site" menu. */
export async function getDevelopSession(userId: string, photoId: string): Promise<DevelopSession> {
  const photo = await findEditablePhoto(prisma, userId, photoId);
  if (!photo || photo.status !== "READY") throw new NotFoundError("Photo");
  return { collectionId: photo.collectionId, title: photo.originalFilename, photos: withOpenNames([toPhoto(photo)]), total: 1 };
}

/** A gallery of a collection, or the chosen photos of it, opened together. */
export async function getBatchDevelopSession(userId: string, collectionId: string, scope: { galleryId?: string; photoIds?: string[] }): Promise<DevelopSession> {
  const collection = await findOwnedCollectionTitle(prisma, userId, collectionId);
  if (!collection) throw new NotFoundError("Collection");
  const { rows, total } = await findDevelopablePhotos(prisma, userId, collectionId, scope, MAX_DEVELOP_BATCH);
  if (rows.length === 0) throw new NotFoundError("Photo");
  return { collectionId: collection.id, title: collection.title, photos: withOpenNames(rows.map(toPhoto)), total };
}
