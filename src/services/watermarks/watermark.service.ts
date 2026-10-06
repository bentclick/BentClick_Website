import "server-only";
import sharp from "sharp";
import { prisma } from "@/lib/db/prisma";
import type { WatermarkSpec } from "@/lib/images/watermark";
import { getR2 } from "@/lib/r2/client";
import { r2Keys } from "@/lib/r2/keys";
import { deleteObjects, readObject, writeObject } from "@/lib/r2/objects";
import { signDisplayUrl } from "@/lib/r2/signed-urls";
import { LOGO_MAX_BYTES, LOGO_TYPES, type WatermarkInput } from "@/lib/validation/watermark";
import { DomainError, NotFoundError } from "@/services/errors";
import type { WatermarkItem, WatermarkOption } from "@/types/watermark";

export function listWatermarkOptions(userId: string): Promise<WatermarkOption[]> {
  return prisma.watermark.findMany({ where: { userId }, orderBy: { name: "asc" }, select: { id: true, name: true } });
}

export async function listWatermarks(userId: string): Promise<WatermarkItem[]> {
  const rows = await prisma.watermark.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    include: { _count: { select: { collections: true } } },
  });
  return Promise.all(
    rows.map(async (w) => ({
      id: w.id,
      name: w.name,
      type: w.type,
      text: w.text ?? "",
      color: w.color,
      opacity: w.opacity,
      size: w.size,
      position: w.position,
      margin: w.margin,
      tile: w.tile,
      logoUrl: await signDisplayUrl(w.imageStorageKey),
      usedBy: w._count.collections,
    })),
  );
}

async function owned(userId: string, watermarkId: string) {
  const wm = await prisma.watermark.findFirst({ where: { id: watermarkId, userId } });
  if (!wm) throw new NotFoundError("Watermark");
  return wm;
}

/** PNG/WebP logos only (transparency matters), ≤ 2 MB, normalised to PNG. */
async function storeLogo(userId: string, watermarkId: string, version: number, file: File): Promise<string> {
  if (!getR2()) throw new DomainError("STORAGE_UNAVAILABLE", "O armazenamento ainda não está configurado.");
  if (!LOGO_TYPES[file.type]) throw new DomainError("LOGO_TYPE", "Use um logo PNG ou WebP (com fundo transparente).");
  if (file.size > LOGO_MAX_BYTES) throw new DomainError("LOGO_SIZE", "O logo deve ter até 2 MB.");
  let png: Buffer;
  try {
    png = await sharp(Buffer.from(await file.arrayBuffer()), { failOn: "error" }).ensureAlpha().resize({ width: 1600, withoutEnlargement: true }).png().toBuffer();
  } catch {
    throw new DomainError("LOGO_INVALID", "Não foi possível ler a imagem do logo.");
  }
  const key = r2Keys.watermarkImage(userId, watermarkId, version, "png");
  await writeObject(key, png, "image/png");
  return key;
}

export async function createWatermark(userId: string, input: WatermarkInput, logo: File | null) {
  if (input.type === "IMAGE" && !logo) throw new DomainError("LOGO_REQUIRED", "Envie o arquivo do logo.");
  const wm = await prisma.watermark.create({
    data: { userId, name: input.name, type: input.type, text: input.text || null, color: input.color, opacity: input.opacity, size: input.size, position: input.position, margin: input.margin, tile: input.tile },
    select: { id: true, version: true },
  });
  if (logo) {
    const key = await storeLogo(userId, wm.id, wm.version, logo);
    await prisma.watermark.update({ where: { id: wm.id }, data: { imageStorageKey: key } });
  }
  return { id: wm.id };
}

/** Every edit bumps the version, so previews rendered with the old look get refreshed. */
export async function updateWatermark(userId: string, watermarkId: string, input: WatermarkInput, logo: File | null) {
  const wm = await owned(userId, watermarkId);
  const version = wm.version + 1;
  let imageStorageKey = wm.imageStorageKey;
  if (logo) imageStorageKey = await storeLogo(userId, wm.id, version, logo);
  if (input.type === "IMAGE" && !imageStorageKey) throw new DomainError("LOGO_REQUIRED", "Envie o arquivo do logo.");
  await prisma.watermark.update({
    where: { id: wm.id },
    data: { name: input.name, type: input.type, text: input.text || null, color: input.color, opacity: input.opacity, size: input.size, position: input.position, margin: input.margin, tile: input.tile, imageStorageKey, version },
  });
  if (logo && wm.imageStorageKey && wm.imageStorageKey !== imageStorageKey) await deleteObjects([wm.imageStorageKey]);
}

/** Collections using it go back to clean previews (refreshed on next visit to the editor). */
export async function deleteWatermark(userId: string, watermarkId: string) {
  const wm = await owned(userId, watermarkId);
  await prisma.$transaction([
    prisma.photographerProfile.updateMany({ where: { userId, defaultWatermarkId: wm.id }, data: { defaultWatermarkId: null } }),
    prisma.watermark.delete({ where: { id: wm.id } }),
  ]);
  if (wm.imageStorageKey && getR2()) await deleteObjects([wm.imageStorageKey]);
}

/** Render-ready spec (logo bytes loaded) for a collection's watermark. */
export async function loadWatermarkSpec(watermarkId: string | null): Promise<{ spec: WatermarkSpec; stamp: string } | null> {
  if (!watermarkId) return null;
  const wm = await prisma.watermark.findUnique({ where: { id: watermarkId } });
  if (!wm) return null;
  const image = wm.type === "IMAGE" && wm.imageStorageKey ? await readObject(wm.imageStorageKey) : null;
  return {
    spec: { type: wm.type, text: wm.text, image, color: wm.color, opacity: wm.opacity, size: wm.size, position: wm.position, margin: wm.margin, tile: wm.tile },
    stamp: `${wm.id}:${wm.version}`,
  };
}
