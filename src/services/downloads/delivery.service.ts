import "server-only";
import type { DownloadQuality } from "@/generated/prisma/enums";
import { deliveredFilename, type DownloadVariant, originalSatisfies, renderDownloadVariant } from "@/lib/images/download-variant";
import { r2Keys } from "@/lib/r2/keys";
import { objectSize, readObject, writeObject } from "@/lib/r2/objects";

export type DeliverablePhoto = {
  id: string;
  userId: string;
  collectionId: string;
  storageKey: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  originalFilename: string;
};

export const VARIANT_FOR_QUALITY: Record<DownloadQuality, DownloadVariant | null> = { ORIGINAL: null, HIGH_RES: "high", WEB: "web" };

/**
 * The object to hand out for a quality. Originals are never altered; smaller
 * copies are rendered on first request and cached in storage.
 */
export async function resolveDeliveryObject(photo: DeliverablePhoto, quality: DownloadQuality): Promise<{ key: string; filename: string }> {
  const variant = VARIANT_FOR_QUALITY[quality];
  if (!variant || originalSatisfies(variant, photo.mimeType, photo.width, photo.height)) {
    return { key: photo.storageKey, filename: photo.originalFilename };
  }
  const key = r2Keys.downloadVariant(photo.userId, photo.collectionId, photo.id, variant);
  if ((await objectSize(key)) === null) {
    const rendered = await renderDownloadVariant(await readObject(photo.storageKey), variant);
    await writeObject(key, rendered, "image/jpeg");
  }
  return { key, filename: deliveredFilename(photo.originalFilename, true) };
}

/** Every cached copy a photo may have, for deletion. */
export function deliveryKeys(photo: { id: string; userId: string; collectionId: string }): string[] {
  return (["high", "web"] as const).map((v) => r2Keys.downloadVariant(photo.userId, photo.collectionId, photo.id, v));
}
