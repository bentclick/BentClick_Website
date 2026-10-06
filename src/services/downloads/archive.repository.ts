import "server-only";
import type { DownloadJobStatus, DownloadKind, DownloadQuality } from "@/generated/prisma/enums";
import type { Db } from "@/lib/db/types";

const deliverableSelect = {
  id: true,
  userId: true,
  collectionId: true,
  storageKey: true,
  mimeType: true,
  width: true,
  height: true,
  originalFilename: true,
  fileSize: true,
} as const;

export function listReadyPhotosForArchive(db: Db, collectionId: string, filter: { clientSessionId?: string; photoIds?: string[] } = {}) {
  return db.photo.findMany({
    where: {
      collectionId,
      status: "READY",
      ...(filter.clientSessionId ? { favorites: { some: { clientSessionId: filter.clientSessionId } } } : {}),
      ...(filter.photoIds ? { id: { in: filter.photoIds } } : {}),
    },
    orderBy: [{ gallery: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    select: deliverableSelect,
  });
}

export function findReusableJob(db: Db, collectionId: string, fingerprint: string, minExpiry: Date) {
  return db.downloadJob.findFirst({
    where: { collectionId, fingerprint, status: { in: ["QUEUED", "PROCESSING", "READY"] }, expiresAt: { gt: minExpiry } },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
}

export function createJobWithParts(
  db: Db,
  data: {
    collectionId: string;
    clientSessionId?: string;
    requestedByUserId?: string;
    type: DownloadKind;
    quality: DownloadQuality;
    fingerprint: string;
    fileCount: number;
    totalBytes: bigint;
    expiresAt: Date;
    parts: { photoIds: string[]; bytes: bigint }[];
  },
) {
  const { parts, ...job } = data;
  return db.downloadJob.create({
    data: { ...job, parts: { create: parts.map((p, index) => ({ index, photoIds: p.photoIds, bytes: p.bytes })) } },
    select: { id: true },
  });
}

export function findJob(db: Db, jobId: string) {
  return db.downloadJob.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      collectionId: true,
      clientSessionId: true,
      requestedByUserId: true,
      type: true,
      quality: true,
      status: true,
      fileCount: true,
      totalBytes: true,
      expiresAt: true,
      collection: { select: { userId: true, title: true } },
      parts: { orderBy: { index: "asc" }, select: { id: true, index: true, status: true, bytes: true, zipStorageKey: true, photoIds: true, attempts: true, startedAt: true } },
    },
  });
}

export type ArchiveJobRow = NonNullable<Awaited<ReturnType<typeof findJob>>>;

export const MAX_PART_ATTEMPTS = 3;
const STALE_MS = 10 * 60 * 1000;

/** Atomic claim: queued parts, or parts whose worker died mid-way. */
export async function claimPart(db: Db, partId: string): Promise<boolean> {
  const { count } = await db.downloadArchivePart.updateMany({
    where: {
      id: partId,
      attempts: { lt: MAX_PART_ATTEMPTS },
      OR: [{ status: "QUEUED" }, { status: "PROCESSING", startedAt: { lt: new Date(Date.now() - STALE_MS) } }],
    },
    data: { status: "PROCESSING", startedAt: new Date(), attempts: { increment: 1 } },
  });
  return count === 1;
}

export function finishPart(db: Db, partId: string, data: { status: DownloadJobStatus; zipStorageKey?: string; error?: string | null }) {
  return db.downloadArchivePart.update({ where: { id: partId }, data: { ...data, completedAt: data.status === "READY" ? new Date() : null } });
}

export function setJobStatus(db: Db, jobId: string, status: DownloadJobStatus, error?: string) {
  return db.downloadJob.update({
    where: { id: jobId },
    data: { status, error: error ?? null, ...(status === "PROCESSING" ? { startedAt: new Date() } : {}), ...(status === "READY" ? { completedAt: new Date() } : {}) },
  });
}

export function logDownload(
  db: Db,
  data: { collectionId: string; kind: DownloadKind; quality: DownloadQuality; photoId?: string; clientSessionId?: string; downloadJobId?: string; bytes?: bigint; ipHash?: string },
) {
  return db.download.create({ data });
}
