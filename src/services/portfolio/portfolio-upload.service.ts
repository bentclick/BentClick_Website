import "server-only";
import { prisma } from "@/lib/db/prisma";
import { InvalidImageError, renderDerivatives } from "@/lib/images/derivatives";
import { getR2 } from "@/lib/r2/client";
import { r2Keys } from "@/lib/r2/keys";
import { deleteObjects, objectSize, presignUpload, readObject, writeObject } from "@/lib/r2/objects";
import { newId } from "@/lib/security/ids";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { checkFile, sanitizeFilename } from "@/lib/uploads/file-types";
import type { CompleteResponse, PresignResponse } from "@/lib/validation/upload";
import { DomainError, NotFoundError } from "@/services/errors";
import { getStorageUsage } from "@/services/storage/storage.service";
import { findOwnedAlbum, findOwnedImages, nextImageOrder } from "./portfolio.repository";

function assertStorage() {
  if (!getR2()) throw new DomainError("STORAGE_UNAVAILABLE", "O armazenamento de fotos ainda não está configurado.");
}

/** Same lifecycle as client photos (docs §7), for public portfolio images. RAW isn't accepted here. */
export async function requestPortfolioUploads(
  userId: string,
  albumId: string,
  files: { clientId: string; name: string; type: string; size: number }[],
): Promise<PresignResponse> {
  assertStorage();
  await enforceRateLimit(`presign:${userId}`, 60, 60);
  const album = await findOwnedAlbum(prisma, userId, albumId);
  if (!album) throw new NotFoundError("Album");

  const accepted: { clientId: string; id: string; name: string; size: number; mimeType: string; key: string }[] = [];
  const rejected: PresignResponse["rejected"] = [];
  for (const file of files) {
    const check = checkFile(file);
    if (!check.ok || check.kind === "raw") {
      rejected.push({ clientId: file.clientId, reason: check.ok ? "Use JPG, PNG ou WebP no portfólio" : check.reason });
      continue;
    }
    const id = newId();
    accepted.push({ clientId: file.clientId, id, name: sanitizeFilename(file.name), size: file.size, mimeType: check.mimeType, key: r2Keys.portfolioOriginal(userId, album.id, id, check.extension) });
  }
  if (!accepted.length) return { uploads: [], rejected };

  const usage = await getStorageUsage(userId);
  if (usage.usedBytes + accepted.reduce((s, f) => s + f.size, 0) > usage.quotaBytes) {
    throw new DomainError("QUOTA_EXCEEDED", "Espaço de armazenamento insuficiente para estas fotos.");
  }

  const order = await nextImageOrder(prisma, album.id);
  await prisma.portfolioImage.createMany({
    data: accepted.map((f, i) => ({ id: f.id, albumId: album.id, filename: f.name, mimeType: f.mimeType, fileSize: BigInt(f.size), storageKey: f.key, sortOrder: order + i })),
  });
  return {
    uploads: await Promise.all(accepted.map(async (f) => ({ clientId: f.clientId, photoId: f.id, contentType: f.mimeType, url: await presignUpload(f.key, f.mimeType, f.size) }))),
    rejected,
  };
}

export async function resignPortfolioUpload(userId: string, imageId: string) {
  assertStorage();
  const [image] = await findOwnedImages(prisma, userId, [imageId]);
  if (!image || image.status !== "PENDING_UPLOAD") throw new NotFoundError("Image");
  return { url: await presignUpload(image.storageKey, image.mimeType, Number(image.fileSize)), contentType: image.mimeType };
}

export async function completePortfolioUploads(userId: string, imageIds: string[]): Promise<CompleteResponse> {
  assertStorage();
  const images = await findOwnedImages(prisma, userId, imageIds);
  const completed: string[] = images.filter((i) => i.status !== "PENDING_UPLOAD").map((i) => i.id);
  const failed: CompleteResponse["failed"] = [];
  await Promise.all(
    images
      .filter((i) => i.status === "PENDING_UPLOAD")
      .map(async (image) => {
        const size = await objectSize(image.storageKey);
        if (size === null || BigInt(size) !== image.fileSize) return failed.push({ photoId: image.id, reason: "Arquivo não chegou completo ao armazenamento" });
        await prisma.portfolioImage.updateMany({ where: { id: image.id, status: "PENDING_UPLOAD" }, data: { status: "UPLOADED" } });
        completed.push(image.id);
      }),
  );
  const known = new Set(images.map((i) => i.id));
  for (const id of imageIds) if (!known.has(id)) failed.push({ photoId: id, reason: "Foto não encontrada" });
  return { completed, failed };
}

export async function processPortfolioImage(userId: string, imageId: string) {
  const [image] = await findOwnedImages(prisma, userId, [imageId]);
  if (!image) throw new NotFoundError("Image");
  const { count } = await prisma.portfolioImage.updateMany({ where: { id: image.id, status: { in: ["UPLOADED", "FAILED"] } }, data: { status: "PROCESSING" } });
  if (count === 0) return { status: image.status };

  try {
    const result = await renderDerivatives(await readObject(image.storageKey));
    const previewKey = r2Keys.portfolioPreview(userId, image.albumId, image.id);
    const thumbnailKey = r2Keys.portfolioThumbnail(userId, image.albumId, image.id);
    await Promise.all([writeObject(previewKey, result.preview, "image/webp"), writeObject(thumbnailKey, result.thumbnail, "image/webp")]);
    // First ready image becomes the album cover automatically.
    const hasCover = await prisma.portfolioImage.count({ where: { albumId: image.albumId, isCover: true } });
    await prisma.portfolioImage.update({
      where: { id: image.id },
      data: { status: "READY", previewKey, thumbnailKey, width: result.width, height: result.height, dominantColor: result.dominantColor, isCover: hasCover === 0 },
    });
    return { status: "READY" };
  } catch (error) {
    if (error instanceof InvalidImageError) {
      await deleteObjects([image.storageKey]);
      await prisma.portfolioImage.delete({ where: { id: image.id } });
      return { status: "REMOVED", reason: error.message };
    }
    console.error("[portfolio] derivative failed", imageId, error);
    await prisma.portfolioImage.update({ where: { id: image.id }, data: { status: "FAILED" } });
    return { status: "FAILED", reason: "Falha ao gerar a pré-visualização" };
  }
}
