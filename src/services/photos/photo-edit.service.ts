import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { type Derivatives, InvalidImageError, renderDerivatives } from "@/lib/images/derivatives";
import { previewVersion } from "@/lib/images/photo-source";
import { renderOriginal } from "@/lib/images/raw-derivatives";
import { applyWatermark } from "@/lib/images/watermark";
import { getR2 } from "@/lib/r2/client";
import { r2Keys } from "@/lib/r2/keys";
import { deleteObjects, objectSize, presignUpload, readObject, writeObject } from "@/lib/r2/objects";
import { newId } from "@/lib/security/ids";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { checkEditedFile, sanitizeFilename } from "@/lib/uploads/file-types";
import { type EditPresignRequest, parsePendingEdit, type PendingEdit } from "@/lib/validation/photo-edit";
import { deliveryKeys } from "@/services/downloads/delivery.service";
import { DomainError, NotFoundError } from "@/services/errors";
import { getStorageUsage } from "@/services/storage/storage.service";
import { loadWatermarkSpec } from "@/services/watermarks/watermark.service";
import { type EditablePhoto, findEditablePhoto, savePendingEdit, swapEditedVersion } from "./photo-edit.repository";
import { adjustCounters } from "./photo.repository";

/**
 * Edited version of a photo (docs/PLANO-REVELACAO-RAW-LIGHTCRAFT.md, phase 1).
 * Clients see and download it; the original is never written or removed here,
 * so "voltar ao original" is always possible.
 */

async function loadReadyPhoto(userId: string, photoId: string): Promise<EditablePhoto> {
  if (!getR2()) throw new DomainError("STORAGE_UNAVAILABLE", "O armazenamento de fotos ainda não está configurado.");
  const photo = await findEditablePhoto(prisma, userId, photoId);
  if (!photo) throw new NotFoundError("Photo");
  if (photo.status !== "READY") throw new DomainError("NOT_READY", "Aguarde a pré-visualização ficar pronta.");
  return photo;
}

export async function requestEditUpload(userId: string, photoId: string, file: EditPresignRequest): Promise<{ url: string; contentType: string }> {
  await enforceRateLimit(`presign:${userId}`, 60, 60);
  const photo = await loadReadyPhoto(userId, photoId);

  const check = checkEditedFile(file);
  if (!check.ok) throw new DomainError("INVALID_FILE", check.reason);

  const usage = await getStorageUsage(userId);
  if (usage.usedBytes - Number(photo.editedFileSize ?? 0n) + file.size > usage.quotaBytes) {
    throw new DomainError("QUOTA_EXCEEDED", "Espaço de armazenamento insuficiente para esta foto.");
  }

  // One pending upload per photo, so abandoned attempts cannot pile up in storage.
  const previous = parsePendingEdit(photo.pendingEdit);
  if (previous) await deleteObjects([previous.key]);

  const pending: PendingEdit = {
    key: r2Keys.edited(userId, photo.collectionId, photo.id, newId(), check.extension),
    filename: sanitizeFilename(file.name),
    mimeType: check.mimeType,
    size: file.size,
  };
  await savePendingEdit(prisma, photo.id, pending);
  return { url: await presignUpload(pending.key, pending.mimeType, pending.size), contentType: pending.mimeType };
}

async function storeDerivatives(photo: EditablePhoto, rendered: Derivatives, editedKey: string | null) {
  const collection = await prisma.collection.findUnique({ where: { id: photo.collectionId }, select: { watermarkId: true } });
  const watermark = await loadWatermarkSpec(collection?.watermarkId ?? null);
  const stamp = watermark?.stamp ?? null;
  const preview = watermark ? await applyWatermark(rendered.preview, watermark.spec) : rendered.preview;
  const previewKey = r2Keys.preview(photo.userId, photo.collectionId, photo.id, previewVersion(editedKey, stamp));
  const thumbnailKey = r2Keys.thumbnail(photo.userId, photo.collectionId, photo.id, previewVersion(editedKey, null));
  await Promise.all([writeObject(thumbnailKey, rendered.thumbnail, "image/webp"), writeObject(previewKey, preview, "image/webp")]);
  return { previewKey, thumbnailKey, previewStamp: stamp, width: rendered.width, height: rendered.height, dominantColor: rendered.dominantColor };
}

/** Runs after the database points at the new files. A failure here only leaves an orphan, so it must not fail the edit. */
async function removeReplaced(photo: EditablePhoto, kept: { previewKey: string; thumbnailKey: string }) {
  const stale = [photo.editedKey, photo.previewKey !== kept.previewKey ? photo.previewKey : null, photo.thumbnailKey !== kept.thumbnailKey ? photo.thumbnailKey : null];
  try {
    await deleteObjects([...stale.filter((k): k is string => Boolean(k)), ...deliveryKeys(photo)]);
  } catch (error) {
    console.error("[photo-edit] cleanup failed", photo.id, error);
  }
}

async function renderPending(photo: EditablePhoto, pending: PendingEdit): Promise<Derivatives> {
  try {
    return await renderDerivatives(await readObject(pending.key));
  } catch (error) {
    if (!(error instanceof InvalidImageError)) throw error;
    await deleteObjects([pending.key]);
    await savePendingEdit(prisma, photo.id, Prisma.DbNull);
    throw new DomainError("INVALID_IMAGE", error.message);
  }
}

/** Verifies the upload, renders it and makes it the version clients get. */
export async function completeEditUpload(userId: string, photoId: string): Promise<{ edited: true }> {
  const photo = await loadReadyPhoto(userId, photoId);
  const pending = parsePendingEdit(photo.pendingEdit);
  if (!pending) {
    if (photo.editedKey) return { edited: true }; // repeated "complete"
    throw new DomainError("NO_UPLOAD", "Nenhum envio em andamento para esta foto.");
  }

  const size = await objectSize(pending.key);
  if (size === null) throw new DomainError("UPLOAD_MISSING", "O arquivo não chegou ao armazenamento.");
  if (size !== pending.size) throw new DomainError("UPLOAD_MISMATCH", "O tamanho do arquivo não confere.");

  const stored = await storeDerivatives(photo, await renderPending(photo, pending), pending.key);

  const bytes = BigInt(pending.size);
  const won = await prisma.$transaction(async (tx) => {
    const { count } = await swapEditedVersion(tx, photo, {
      ...stored,
      editedKey: pending.key,
      editedFilename: pending.filename,
      editedMimeType: pending.mimeType,
      editedFileSize: bytes,
      editedAt: new Date(),
      pendingEdit: Prisma.DbNull,
    });
    if (count === 1) await adjustCounters(tx, photo.collectionId, photo.galleryId, 0, bytes - (photo.editedFileSize ?? 0n));
    return count === 1;
  });
  if (won) await removeReplaced(photo, stored);
  return { edited: true };
}

/** Back to the camera file: previews are rebuilt from the untouched original. */
export async function revertToOriginal(userId: string, photoId: string): Promise<{ edited: false }> {
  const photo = await loadReadyPhoto(userId, photoId);
  if (!photo.editedKey) return { edited: false };

  const stored = await storeDerivatives(photo, await renderOriginal(await readObject(photo.storageKey), photo.mimeType), null);

  const won = await prisma.$transaction(async (tx) => {
    const { count } = await swapEditedVersion(tx, photo, {
      ...stored,
      editedKey: null,
      editedFilename: null,
      editedMimeType: null,
      editedFileSize: null,
      editedAt: null,
    });
    if (count === 1) await adjustCounters(tx, photo.collectionId, photo.galleryId, 0, -(photo.editedFileSize ?? 0n));
    return count === 1;
  });
  if (won) await removeReplaced(photo, stored);
  return { edited: false };
}
