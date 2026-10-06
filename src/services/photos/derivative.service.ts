import "server-only";
import type { PhotoStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { InvalidImageError, renderDerivatives } from "@/lib/images/derivatives";
import { r2Keys } from "@/lib/r2/keys";
import { deleteObjects, readObject, writeObject } from "@/lib/r2/objects";
import { NotFoundError } from "@/services/errors";
import { adjustCounters, claimForProcessing, findOwnedPhotos, findPhotoForProcessing, updatePhoto } from "./photo.repository";

export type ProcessResult = { photoId: string; status: PhotoStatus | "REMOVED"; reason?: string };

/**
 * Generates thumbnail + preview for one photo. One photo per invocation keeps
 * each request short; the browser fans out a few at a time after uploading.
 * Watermarking of the preview plugs in here (Phase: watermarks).
 */
export async function processPhoto(userId: string, photoId: string): Promise<ProcessResult> {
  const [owned] = await findOwnedPhotos(prisma, userId, [photoId]);
  if (!owned) throw new NotFoundError("Photo");

  // RAW files are kept as originals only; no previews are generated.
  if (owned.mimeType === "application/octet-stream") return { photoId, status: owned.status };

  const { count } = await claimForProcessing(prisma, photoId, userId);
  if (count === 0) return { photoId, status: owned.status }; // already processing or ready

  const photo = await findPhotoForProcessing(prisma, photoId);
  if (!photo) throw new NotFoundError("Photo");

  try {
    const original = await readObject(photo.storageKey);
    const result = await renderDerivatives(original);
    const thumbnailKey = r2Keys.thumbnail(photo.userId, photo.collectionId, photo.id);
    const previewKey = r2Keys.preview(photo.userId, photo.collectionId, photo.id);
    await Promise.all([writeObject(thumbnailKey, result.thumbnail, "image/webp"), writeObject(previewKey, result.preview, "image/webp")]);

    await updatePhoto(prisma, photo.id, {
      status: "READY",
      thumbnailKey,
      previewKey,
      width: result.width,
      height: result.height,
      dominantColor: result.dominantColor,
      metadata: { format: result.format },
    });
    return { photoId, status: "READY" };
  } catch (error) {
    if (error instanceof InvalidImageError) {
      // Content didn't match an accepted image: remove bytes and row so it never counts or shows.
      await deleteObjects([owned.storageKey]);
      await prisma.$transaction(async (tx) => {
        await tx.photo.delete({ where: { id: photo.id } });
        await adjustCounters(tx, owned.collectionId, owned.galleryId, -1, -owned.fileSize);
      });
      return { photoId, status: "REMOVED", reason: error.message };
    }
    console.error("[derivatives] failed", photoId, error);
    await updatePhoto(prisma, photo.id, { status: "FAILED", failureReason: "Falha ao gerar a pré-visualização" });
    return { photoId, status: "FAILED", reason: "Falha ao gerar a pré-visualização" };
  }
}
