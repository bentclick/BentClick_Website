import "server-only";
import { prisma } from "@/lib/db/prisma";
import { signDownloadUrl } from "@/lib/r2/signed-urls";
import { NotFoundError } from "@/services/errors";
import { findOwnedCollection } from "@/services/collections/collection.repository";
import { findOwnedClientSession } from "@/services/favorites/favorite.repository";
import { findOwnedPhotos } from "@/services/photos/photo.repository";
import { type ArchiveStatus, loadJob, needsWork, requestArchive, signArchivePart, toArchiveStatus } from "./archive.service";

/** The photographer always gets untouched originals (RAW included). */
export async function ownerPhotoUrl(userId: string, photoId: string): Promise<string> {
  const [photo] = await findOwnedPhotos(prisma, userId, [photoId]);
  if (!photo || photo.status === "PENDING_UPLOAD") throw new NotFoundError("Photo");
  const full = await prisma.photo.findUniqueOrThrow({ where: { id: photo.id }, select: { originalFilename: true } });
  return signDownloadUrl(photo.storageKey, full.originalFilename);
}

export async function ownerRequestArchive(userId: string, collectionId: string, scope: { kind: "all" } | { kind: "selection"; sessionId: string }) {
  const collection = await findOwnedCollection(prisma, userId, collectionId);
  if (!collection) throw new NotFoundError("Collection");
  if (scope.kind === "selection") {
    const session = await findOwnedClientSession(prisma, userId, scope.sessionId);
    if (!session || session.collectionId !== collection.id) throw new NotFoundError("Selection");
    return requestArchive({ collectionId: collection.id, type: "FAVORITES", quality: "ORIGINAL", clientSessionId: session.id, requestedByUserId: userId });
  }
  return requestArchive({ collectionId: collection.id, type: "ALL", quality: "ORIGINAL", requestedByUserId: userId });
}

async function ownedJob(userId: string, jobId: string) {
  const job = await loadJob(jobId);
  if (!job || job.collection.userId !== userId) throw new NotFoundError("Archive");
  return job;
}

export async function ownerArchiveStatus(userId: string, jobId: string): Promise<{ status: ArchiveStatus; needsWork: boolean }> {
  const job = await ownedJob(userId, jobId);
  return { status: toArchiveStatus(job), needsWork: needsWork(job) };
}

export async function ownerArchivePartUrl(userId: string, jobId: string, index: number): Promise<string> {
  return signArchivePart(await ownedJob(userId, jobId), index);
}
