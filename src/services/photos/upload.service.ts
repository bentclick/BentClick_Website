import "server-only";
import { prisma } from "@/lib/db/prisma";
import { getR2 } from "@/lib/r2/client";
import { r2Keys } from "@/lib/r2/keys";
import { objectSize, presignUpload } from "@/lib/r2/objects";
import { newId } from "@/lib/security/ids";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { checkFile, sanitizeFilename } from "@/lib/uploads/file-types";
import { type IncomingFile, planDuplicates } from "@/lib/uploads/duplicates";
import type { CompleteResponse, DuplicateCheckRequest, DuplicateCheckResponse, PresignRequest, PresignResponse } from "@/lib/validation/upload";
import { DomainError, NotFoundError } from "@/services/errors";
import { findOwnedGallery } from "@/services/galleries/gallery.repository";
import { getStorageUsage } from "@/services/storage/storage.service";
import { adjustCounters, findGalleryPhotosByName, findOwnedPhotos, insertPendingPhotos, markUploaded, nextSortOrder } from "./photo.repository";

function assertStorage() {
  if (!getR2()) throw new DomainError("STORAGE_UNAVAILABLE", "O armazenamento de fotos ainda não está configurado.");
}

type AcceptedFile = { clientId: string; id: string; name: string; size: number; mimeType: string; key: string };

const DUPLICATE_REASON = "Já está na galeria";

async function ownedGalleryOrThrow(userId: string, collectionId: string, galleryId: string) {
  const gallery = await findOwnedGallery(prisma, userId, galleryId);
  if (!gallery || gallery.collectionId !== collectionId) throw new NotFoundError("Gallery");
  return gallery;
}

/** Name + size match against what the gallery already holds (src/lib/uploads/duplicates.ts). */
async function duplicatePlan(userId: string, galleryId: string, files: IncomingFile[]) {
  const names = [...new Set(files.map((f) => sanitizeFilename(f.name)))];
  const existing = names.length ? await findGalleryPhotosByName(prisma, userId, galleryId, names) : [];
  return planDuplicates(files, existing, Date.now());
}

/**
 * Before anything is reserved: which of these files are already in the gallery?
 * Lets the photographer drop a whole folder again after an interrupted upload.
 */
export async function findDuplicateUploads(userId: string, request: DuplicateCheckRequest): Promise<DuplicateCheckResponse> {
  await enforceRateLimit(`upload-check:${userId}`, 30, 60);
  const gallery = await ownedGalleryOrThrow(userId, request.collectionId, request.galleryId);
  const plan = await duplicatePlan(userId, gallery.id, request.files);
  return { duplicates: plan.duplicates };
}

/**
 * Step 1 of the upload lifecycle (docs/ARCHITECTURE.md §7): validate, skip files
 * already in the gallery, reuse reservations left by an interrupted upload, reserve
 * the rest as PENDING_UPLOAD and hand back one presigned PUT per file.
 */
export async function requestUploads(userId: string, request: PresignRequest): Promise<PresignResponse> {
  assertStorage();
  await enforceRateLimit(`presign:${userId}`, 60, 60);
  const gallery = await ownedGalleryOrThrow(userId, request.collectionId, request.galleryId);

  const rejected: PresignResponse["rejected"] = [];
  const valid = new Map<string, { file: PresignRequest["files"][number]; mimeType: string; extension: string }>();
  for (const file of request.files) {
    const check = checkFile(file);
    if (check.ok) valid.set(file.clientId, { file, mimeType: check.mimeType, extension: check.extension });
    else rejected.push({ clientId: file.clientId, reason: check.reason });
  }
  if (valid.size === 0) return { uploads: [], rejected };

  const plan = await duplicatePlan(userId, gallery.id, [...valid.values()].map((v) => v.file));
  for (const clientId of plan.duplicates) rejected.push({ clientId, reason: DUPLICATE_REASON, duplicate: true });

  const accepted: AcceptedFile[] = plan.fresh.map((clientId) => {
    const { file, mimeType, extension } = valid.get(clientId)!;
    const id = newId();
    return { clientId, id, name: sanitizeFilename(file.name), size: file.size, mimeType, key: r2Keys.original(userId, gallery.collectionId, id, extension) };
  });
  if (accepted.length > 0) await reservePhotos(userId, gallery, accepted);

  const reused: AcceptedFile[] = plan.reuse.map(({ clientId, photo }) => ({
    clientId,
    id: photo.id,
    name: photo.originalFilename,
    size: Number(photo.fileSize),
    mimeType: photo.mimeType,
    key: photo.storageKey,
  }));

  const uploads = await Promise.all(
    [...accepted, ...reused].map(async (f) => ({
      clientId: f.clientId,
      photoId: f.id,
      contentType: f.mimeType,
      url: await presignUpload(f.key, f.mimeType, f.size),
    })),
  );
  return { uploads, rejected };
}

/** Quota check for the new bytes only (a reused reservation is already counted), then the PENDING_UPLOAD rows. */
async function reservePhotos(userId: string, gallery: { id: string; collectionId: string }, accepted: AcceptedFile[]) {
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
