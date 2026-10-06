import "server-only";
import { prisma } from "@/lib/db/prisma";
import { getR2 } from "@/lib/r2/client";
import { r2Keys } from "@/lib/r2/keys";
import { objectSize, presignUpload } from "@/lib/r2/objects";
import { newId } from "@/lib/security/ids";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { checkFile, sanitizeFilename } from "@/lib/uploads/file-types";
import type { CompleteResponse, PresignRequest, PresignResponse } from "@/lib/validation/upload";
import { DomainError, NotFoundError } from "@/services/errors";
import { findOwnedGallery } from "@/services/galleries/gallery.repository";
import { getStorageUsage } from "@/services/storage/storage.service";
import { adjustCounters, findOwnedPhotos, insertPendingPhotos, markUploaded, nextSortOrder } from "./photo.repository";

function assertStorage() {
  if (!getR2()) throw new DomainError("STORAGE_UNAVAILABLE", "O armazenamento de fotos ainda não está configurado.");
}

/**
 * Step 1 of the upload lifecycle (docs/ARCHITECTURE.md §7): validate, reserve
 * Photo rows as PENDING_UPLOAD and hand back one presigned PUT per file.
 */
export async function requestUploads(userId: string, request: PresignRequest): Promise<PresignResponse> {
  assertStorage();
  await enforceRateLimit(`presign:${userId}`, 60, 60);

  const gallery = await findOwnedGallery(prisma, userId, request.galleryId);
  if (!gallery || gallery.collectionId !== request.collectionId) throw new NotFoundError("Gallery");

  const accepted: { clientId: string; id: string; name: string; size: number; mimeType: string; key: string }[] = [];
  const rejected: PresignResponse["rejected"] = [];
  for (const file of request.files) {
    const check = checkFile(file);
    if (!check.ok) {
      rejected.push({ clientId: file.clientId, reason: check.reason });
      continue;
    }
    const id = newId();
    accepted.push({
      clientId: file.clientId,
      id,
      name: sanitizeFilename(file.name),
      size: file.size,
      mimeType: check.mimeType,
      key: r2Keys.original(userId, gallery.collectionId, id, check.extension),
    });
  }
  if (accepted.length === 0) return { uploads: [], rejected };

  const usage = await getStorageUsage(userId);
  const batchBytes = accepted.reduce((sum, f) => sum + f.size, 0);
  if (usage.usedBytes + batchBytes > usage.quotaBytes) {
    throw new DomainError("QUOTA_EXCEEDED", "Espaço de armazenamento insuficiente para estas fotos.");
  }

  const baseOrder = await nextSortOrder(prisma, gallery.id);
  await insertPendingPhotos(
    prisma,
    accepted.map((f, i) => ({
      id: f.id,
      userId,
      collectionId: gallery.collectionId,
      galleryId: gallery.id,
      filename: f.name,
      originalFilename: f.name,
      mimeType: f.mimeType,
      fileSize: BigInt(f.size),
      storageKey: f.key,
      status: "PENDING_UPLOAD" as const,
      sortOrder: baseOrder + i,
    })),
  );

  const uploads = await Promise.all(
    accepted.map(async (f) => ({
      clientId: f.clientId,
      photoId: f.id,
      contentType: f.mimeType,
      url: await presignUpload(f.key, f.mimeType, f.size),
    })),
  );
  return { uploads, rejected };
}

/** Fresh URL for a retry of a photo whose upload failed or expired. */
export async function resignUpload(userId: string, photoId: string) {
  assertStorage();
  await enforceRateLimit(`presign:${userId}`, 60, 60);
  const [photo] = await findOwnedPhotos(prisma, userId, [photoId], "PENDING_UPLOAD");
  if (!photo) throw new NotFoundError("Photo");
  return { photoId, contentType: photo.mimeType, url: await presignUpload(photo.storageKey, photo.mimeType, Number(photo.fileSize)) };
}

/**
 * Step 2: the browser reports finished PUTs. Each object is verified in
 * storage (exists, exact size) before the row becomes UPLOADED and counts.
 */
export async function completeUploads(userId: string, photoIds: string[]): Promise<CompleteResponse> {
  assertStorage();
  const owned = await findOwnedPhotos(prisma, userId, photoIds);
  // A repeated "complete" for an already-confirmed photo is idempotent.
  const completed: string[] = owned.filter((p) => p.status !== "PENDING_UPLOAD").map((p) => p.id);
  const photos = owned.filter((p) => p.status === "PENDING_UPLOAD");
  const failed: CompleteResponse["failed"] = [];

  await Promise.all(
    photos.map(async (photo) => {
      const size = await objectSize(photo.storageKey);
      if (size === null) return failed.push({ photoId: photo.id, reason: "Arquivo não chegou ao armazenamento" });
      if (BigInt(size) !== photo.fileSize) return failed.push({ photoId: photo.id, reason: "Tamanho do arquivo não confere" });

      await prisma.$transaction(async (tx) => {
        const { count } = await markUploaded(tx, photo.id);
        if (count === 1) await adjustCounters(tx, photo.collectionId, photo.galleryId, 1, photo.fileSize);
      });
      completed.push(photo.id);
    }),
  );

  const known = new Set(owned.map((p) => p.id));
  for (const id of photoIds) if (!known.has(id)) failed.push({ photoId: id, reason: "Foto não encontrada" });
  return { completed, failed };
}
