import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { renderDerivatives } from "@/lib/images/derivatives";
import { applyWatermark } from "@/lib/images/watermark";
import { r2Keys } from "@/lib/r2/keys";
import { deleteObjects, readObject, writeObject } from "@/lib/r2/objects";
import { NotFoundError } from "@/services/errors";
import { loadWatermarkSpec } from "@/services/watermarks/watermark.service";

/** READY photos whose preview wasn't rendered with the collection's current watermark look. */
function outdatedWhere(collectionId: string, stamp: string | null): Prisma.PhotoWhereInput {
  return {
    collectionId,
    status: "READY",
    ...(stamp ? { OR: [{ previewStamp: null }, { previewStamp: { not: stamp } }] } : { previewStamp: { not: null } }),
  };
}

async function currentStamp(collectionId: string) {
  const c = await prisma.collection.findUnique({ where: { id: collectionId }, select: { watermark: { select: { id: true, version: true } } } });
  return c?.watermark ? `${c.watermark.id}:${c.watermark.version}` : null;
}

export async function countOutdatedPreviews(collectionId: string): Promise<number> {
  return prisma.photo.count({ where: outdatedWhere(collectionId, await currentStamp(collectionId)) });
}

/**
 * Re-renders outdated previews until the time budget runs out. Photos stay
 * visible with their old preview meanwhile; each new preview gets a new key,
 * so browsers never show a cached old version. Returns what is left.
 */
export async function refreshPreviews(userId: string, collectionId: string, budgetMs = 45_000): Promise<{ remaining: number; refreshed: number }> {
  const collection = await prisma.collection.findFirst({ where: { id: collectionId, userId }, select: { id: true, watermarkId: true } });
  if (!collection) throw new NotFoundError("Collection");
  const watermark = await loadWatermarkSpec(collection.watermarkId);
  const stamp = watermark?.stamp ?? null;
  const started = Date.now();
  let refreshed = 0;

  while (Date.now() - started < budgetMs) {
    const batch = await prisma.photo.findMany({
      where: outdatedWhere(collection.id, stamp),
      take: 5,
      select: { id: true, userId: true, collectionId: true, storageKey: true, previewKey: true },
    });
    if (batch.length === 0) break;
    for (const photo of batch) {
      if (Date.now() - started >= budgetMs) break;
      const { preview } = await renderDerivatives(await readObject(photo.storageKey));
      const body = watermark ? await applyWatermark(preview, watermark.spec) : preview;
      const key = r2Keys.preview(photo.userId, photo.collectionId, photo.id, stamp);
      await writeObject(key, body, "image/webp");
      await prisma.photo.update({ where: { id: photo.id }, data: { previewKey: key, previewStamp: stamp } });
      if (photo.previewKey && photo.previewKey !== key) await deleteObjects([photo.previewKey]);
      refreshed++;
    }
  }
  return { remaining: await prisma.photo.count({ where: outdatedWhere(collection.id, stamp) }), refreshed };
}

/** Choosing (or removing) a collection's watermark; previews are refreshed afterwards. */
export async function setCollectionWatermark(userId: string, collectionId: string, watermarkId: string | null) {
  const collection = await prisma.collection.findFirst({ where: { id: collectionId, userId }, select: { id: true } });
  if (!collection) throw new NotFoundError("Collection");
  if (watermarkId && !(await prisma.watermark.count({ where: { id: watermarkId, userId } }))) throw new NotFoundError("Watermark");
  await prisma.collection.update({ where: { id: collection.id }, data: { watermarkId } });
  return { outdated: await countOutdatedPreviews(collection.id) };
}
