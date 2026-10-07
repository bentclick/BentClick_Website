import "server-only";
import { prisma } from "@/lib/db/prisma";
import { signDownloadUrl } from "@/lib/r2/signed-urls";
import { clientIpHash } from "@/lib/security/client-ip";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { logActivity } from "@/services/activity/activity.repository";
import { DomainError, NotFoundError } from "@/services/errors";
import { assertVisitorIdentified, type ResolvedGallery, resolveGallery } from "@/services/public-gallery/public-gallery.service";
import { logDownload } from "./archive.repository";
import { type ArchiveStatus, loadJob, needsWork, requestArchive, signArchivePart, toArchiveStatus } from "./archive.service";
import { resolveDeliveryObject } from "./delivery.service";

async function visitorKey(resolved: ResolvedGallery) {
  if (resolved.decision.kind === "GRANTED" && resolved.decision.sessionValid && resolved.session) return { sessionId: resolved.session.id, key: resolved.session.id };
  return { sessionId: undefined, key: await clientIpHash() };
}

async function granted(slug: string, preview: boolean) {
  const resolved = await resolveGallery(slug, { preview });
  if (!resolved || resolved.decision.kind !== "GRANTED") throw new NotFoundError("Gallery");
  return { resolved, isPreview: resolved.decision.preview };
}

/** docs/ARCHITECTURE.md §20: published, not expired, downloads enabled, access granted → 10-min URL. */
export async function visitorPhotoDownloadUrl(slug: string, photoId: string, preview: boolean): Promise<string> {
  const { resolved, isPreview } = await granted(slug, preview);
  const { collection } = resolved;
  if (!collection.allowIndividualDownload && !isPreview) throw new DomainError("DOWNLOAD_DISABLED", "O download está desativado nesta galeria.");
  assertVisitorIdentified(resolved);

  const photo = await prisma.photo.findFirst({
    where: { id: photoId, collectionId: collection.id, status: "READY" },
    select: { id: true, userId: true, collectionId: true, storageKey: true, mimeType: true, width: true, height: true, originalFilename: true, fileSize: true },
  });
  if (!photo) throw new NotFoundError("Photo");

  const visitor = await visitorKey(resolved);
  await enforceRateLimit(`dl:${collection.id}:${visitor.key}`, 120, 600);
  const { key, filename } = await resolveDeliveryObject(photo, collection.downloadQuality);

  if (!isPreview) {
    await logDownload(prisma, { collectionId: collection.id, kind: "PHOTO", quality: collection.downloadQuality, photoId: photo.id, clientSessionId: visitor.sessionId, bytes: photo.fileSize });
    await logActivity(prisma, { userId: collection.userId, collectionId: collection.id, clientSessionId: visitor.sessionId, actorType: "CLIENT", type: "PHOTO_DOWNLOADED", metadata: { photoId } });
  }
  return signDownloadUrl(key, filename);
}

export async function requestVisitorArchive(slug: string, scope: "all" | "favorites"): Promise<{ jobId: string }> {
  const { resolved } = await granted(slug, false);
  const { collection } = resolved;
  if (!collection.allowFullDownload) throw new DomainError("DOWNLOAD_DISABLED", "O download da galeria completa está desativado.");
  assertVisitorIdentified(resolved);

  const visitor = await visitorKey(resolved);
  if (scope === "favorites" && !visitor.sessionId) throw new DomainError("NO_SELECTION", "Marque fotos com o coração para baixar suas favoritas.");
  await enforceRateLimit(`zip:${collection.id}:${visitor.key}`, 6, 3600);
  // Per IP too (a new cookie is a new session), and a ceiling on distinct favourites ZIPs per gallery.
  await enforceRateLimit(`zip-ip:${collection.id}:${await clientIpHash()}`, 10, 3600);
  if (scope === "favorites") await enforceRateLimit(`zip-fav:${collection.id}`, 30, 3600);

  return requestArchive({
    collectionId: collection.id,
    type: scope === "favorites" ? "FAVORITES" : "ALL",
    quality: collection.downloadQuality,
    clientSessionId: scope === "favorites" ? visitor.sessionId : undefined,
  });
}

/**
 * A visitor may read an archive of the whole gallery, or favourites archives from their own session —
 * and only while the gallery still allows it at that quality (settings may have changed since the ZIP was built).
 */
async function visitorJob(slug: string, jobId: string) {
  const { resolved } = await granted(slug, false);
  const { collection } = resolved;
  const job = await loadJob(jobId);
  if (!job || job.collectionId !== collection.id) throw new NotFoundError("Archive");
  const stillAllowed = collection.allowFullDownload && job.quality === collection.downloadQuality && (job.type !== "FAVORITES" || collection.allowFavorites);
  if (!stillAllowed) throw new DomainError("DOWNLOAD_DISABLED", "Este download não está mais disponível. Fale com o fotógrafo.");
  if (job.type === "FAVORITES") {
    const visitor = await visitorKey(resolved);
    if (!visitor.sessionId || visitor.sessionId !== job.clientSessionId) throw new NotFoundError("Archive");
  }
  return { resolved, job };
}

export async function visitorArchiveStatus(slug: string, jobId: string): Promise<{ status: ArchiveStatus; needsWork: boolean }> {
  const { job } = await visitorJob(slug, jobId);
  return { status: toArchiveStatus(job), needsWork: needsWork(job) };
}

export async function visitorArchivePartUrl(slug: string, jobId: string, index: number): Promise<string> {
  const { resolved, job } = await visitorJob(slug, jobId);
  const url = await signArchivePart(job, index);
  const visitor = await visitorKey(resolved);
  await logDownload(prisma, { collectionId: job.collectionId, kind: job.type, quality: job.quality, downloadJobId: job.id, clientSessionId: visitor.sessionId, bytes: job.parts[index]?.bytes });
  await logActivity(prisma, {
    userId: resolved.collection.userId,
    collectionId: job.collectionId,
    clientSessionId: visitor.sessionId,
    actorType: "CLIENT",
    type: "ARCHIVE_DOWNLOADED",
    metadata: { jobId: job.id, part: index + 1, of: job.parts.length, scope: job.type },
  });
  return url;
}
