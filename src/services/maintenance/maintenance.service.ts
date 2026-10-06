import "server-only";
import { prisma } from "@/lib/db/prisma";
import { getR2 } from "@/lib/r2/client";
import { deleteObjects } from "@/lib/r2/objects";

const HOUR = 3_600_000;

/** Persists expiry for published galleries nobody has opened since the date passed. */
export async function expireCollections(now = new Date()): Promise<number> {
  const due = await prisma.collection.findMany({
    where: { status: "PUBLISHED", expiresAt: { lte: now } },
    select: { id: true, userId: true },
  });
  for (const c of due) {
    await prisma.$transaction([
      prisma.collection.updateMany({ where: { id: c.id, status: "PUBLISHED" }, data: { status: "EXPIRED" } }),
      prisma.activityLog.create({ data: { userId: c.userId, collectionId: c.id, actorType: "SYSTEM", type: "COLLECTION_EXPIRED" } }),
    ]);
  }
  return due.length;
}

/** Uploads reserved but never confirmed (closed tab, failed network) after 24 h. */
export async function cleanupPendingUploads(now = new Date()): Promise<number> {
  const stale = await prisma.photo.findMany({
    where: { status: "PENDING_UPLOAD", createdAt: { lt: new Date(now.getTime() - 24 * HOUR) } },
    select: { id: true, storageKey: true },
    take: 1000,
  });
  if (stale.length === 0) return 0;
  if (getR2()) await deleteObjects(stale.map((p) => p.storageKey));
  await prisma.photo.deleteMany({ where: { id: { in: stale.map((p) => p.id) } } });
  return stale.length;
}

/** ZIP archives live 72 h; afterwards the objects go and the job is marked expired. */
export async function purgeExpiredArchives(now = new Date()): Promise<number> {
  const jobs = await prisma.downloadJob.findMany({
    where: { expiresAt: { lte: now }, status: { not: "FAILED" } },
    select: { id: true, parts: { select: { zipStorageKey: true } } },
    take: 200,
  });
  if (jobs.length === 0) return 0;
  const keys = jobs.flatMap((j) => j.parts.map((p) => p.zipStorageKey)).filter((k): k is string => Boolean(k));
  if (getR2() && keys.length) await deleteObjects(keys);
  await prisma.$transaction([
    prisma.downloadArchivePart.updateMany({ where: { jobId: { in: jobs.map((j) => j.id) } }, data: { zipStorageKey: null } }),
    prisma.downloadJob.updateMany({ where: { id: { in: jobs.map((j) => j.id) } }, data: { status: "FAILED", error: "Arquivo expirado" } }),
  ]);
  return jobs.length;
}

export async function pruneRateLimits(now = new Date()): Promise<number> {
  const { count } = await prisma.rateLimitBucket.deleteMany({ where: { resetAt: { lt: now } } });
  return count;
}
