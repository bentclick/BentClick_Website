import "server-only";
import { prisma } from "@/lib/db/prisma";
import { deleteObjects } from "@/lib/r2/objects";
import { signDisplayUrl } from "@/lib/r2/signed-urls";
import { DomainError, NotFoundError } from "@/services/errors";
import { deliveryKeys } from "@/services/downloads/delivery.service";
import { findOwnedGallery } from "@/services/galleries/gallery.repository";
import type { EditorPhoto } from "@/types/photo";
import { adjustCounters, deletePhotoRows, findOwnedPhotos, listGalleryPhotos } from "./photo.repository";

/** First page of a gallery for the editor. Larger galleries page in later (virtualised grid). */
export const EDITOR_PAGE_SIZE = 500;

export async function listEditorPhotos(userId: string, galleryId: string): Promise<EditorPhoto[]> {
  const gallery = await findOwnedGallery(prisma, userId, galleryId);
  if (!gallery) throw new NotFoundError("Gallery");
  const rows = await listGalleryPhotos(prisma, gallery.id, EDITOR_PAGE_SIZE);
  return Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      filename: row.filename,
      status: row.status,
      width: row.width,
      height: row.height,
      sizeBytes: Number(row.fileSize),
      thumbnailUrl: await signDisplayUrl(row.thumbnailKey),
      color: row.dominantColor,
      isRaw: row.mimeType === "application/octet-stream",
      failureReason: row.failureReason,
    })),
  );
}

export async function setCoverPhoto(userId: string, photoId: string) {
  const [photo] = await findOwnedPhotos(prisma, userId, [photoId]);
  if (!photo) throw new NotFoundError("Photo");
  if (photo.status !== "READY") throw new DomainError("NOT_READY", "Aguarde a pré-visualização ficar pronta para usar como capa.");
  await prisma.collection.update({ where: { id: photo.collectionId }, data: { coverPhotoId: photo.id } });
}

/** Removes rows and every stored variant. Counters only ever included confirmed uploads. */
export async function deletePhotos(userId: string, photoIds: string[]): Promise<number> {
  const photos = await findOwnedPhotos(prisma, userId, photoIds);
  if (photos.length !== photoIds.length) throw new NotFoundError("Photo");

  await deleteObjects(
    photos.flatMap((p) => [
      p.storageKey,
      p.previewKey,
      p.thumbnailKey,
      ...deliveryKeys({ id: p.id, userId, collectionId: p.collectionId }),
    ].filter((k): k is string => Boolean(k))),
  );

  await prisma.$transaction(async (tx) => {
    await deletePhotoRows(tx, photos.map((p) => p.id));
    const counted = photos.filter((p) => p.status !== "PENDING_UPLOAD");
    const groups = new Map<string, { collectionId: string; galleryId: string; n: number; bytes: bigint }>();
    for (const p of counted) {
      const g = groups.get(p.galleryId) ?? { collectionId: p.collectionId, galleryId: p.galleryId, n: 0, bytes: 0n };
      g.n += 1;
      g.bytes += p.fileSize;
      groups.set(p.galleryId, g);
    }
    for (const g of groups.values()) await adjustCounters(tx, g.collectionId, g.galleryId, -g.n, -g.bytes);
  });
  return photos.length;
}
