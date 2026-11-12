import "server-only";
import type { DownloadQuality } from "@/generated/prisma/enums";
import { deliveredFilename, type DownloadVariant, originalSatisfies, renderDownloadVariant } from "@/lib/images/download-variant";
import { readableImage } from "@/lib/images/raw-derivatives";
import { editToken } from "@/lib/images/photo-source";
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
  const key = r2Keys.downloadVariant(photo.userId, photo.collectionId, photo.id, variant, sourceTag(photo.storageKey));
  if ((await objectSize(key)) === null) {
    const rendered = await renderDownloadVariant(await readableImage(await readObject(photo.storageKey), photo.mimeType), variant);
    await writeObject(key, rendered, "image/jpeg");
  }
  return { key, filename: deliveredFilename(photo.originalFilename, true) };
}

/** Which file a copy was rendered from: one edit (its token) or the original. */
function sourceTag(storageKey: string): string {
  return storageKey.includes("/edited/") ? `e${editToken(storageKey)}` : "o";
}

/** Every cached copy a photo may have from its original and from this edit (plus the old untagged ones), for deletion. */
export function deliveryKeys(photo: { id: string; userId: string; collectionId: string; editedKey?: string | null }): string[] {
  const sources = [undefined, "o", photo.editedKey ? sourceTag(photo.editedKey) : null].filter((s) => s !== null);
  return (["high", "web"] as const).flatMap((v) => sources.map((s) => r2Keys.downloadVariant(photo.userId, photo.collectionId, photo.id, v, s ?? undefined)));
}
