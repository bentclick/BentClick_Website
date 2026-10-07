import "server-only";
import type { DownloadKind, DownloadQuality } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { r2Keys } from "@/lib/r2/keys";
import { signDownloadUrl } from "@/lib/r2/signed-urls";
import { sha256 } from "@/lib/security/tokens";
import { DomainError } from "@/services/errors";
import { buildArchive } from "./archive-builder";
import { planArchiveParts } from "./archive-plan";
import {
  type ArchiveJobRow,
  claimPart,
  createJobWithParts,
  findJob,
  findReusableJob,
  finishPart,
  listReadyPhotosForArchive,
  MAX_PART_ATTEMPTS,
  setJobStatus,
} from "./archive.repository";

export const ARCHIVE_TTL_HOURS = 72;
const PROCESS_BUDGET_MS = 230_000; // leave headroom inside a 300 s function

export type ArchiveRequest = {
  collectionId: string;
  type: Extract<DownloadKind, "ALL" | "FAVORITES">;
  quality: DownloadQuality;
  clientSessionId?: string; // favourites of this visitor
  requestedByUserId?: string;
};

/** Creates (or reuses) an archive job for the photos in scope. */
export async function requestArchive(req: ArchiveRequest): Promise<{ jobId: string }> {
  const photos = await listReadyPhotosForArchive(prisma, req.collectionId, req.type === "FAVORITES" ? { clientSessionId: req.clientSessionId } : {});
  if (photos.length === 0) throw new DomainError("NOTHING_TO_ZIP", "Não há fotos para baixar.");

  const fingerprint = sha256(`${req.quality}:${photos.map((p) => p.id).sort().join(",")}`);
  const reusable = await findReusableJob(prisma, req.collectionId, fingerprint, new Date(Date.now() + 60 * 60 * 1000), req.clientSessionId ?? null);
  if (reusable) return { jobId: reusable.id };

  const sized = photos.map((p) => ({ id: p.id, bytes: Number(p.fileSize) }));
  const parts = planArchiveParts(sized, req.quality);
  const bytesById = new Map(sized.map((p) => [p.id, p.bytes]));
  const job = await createJobWithParts(prisma, {
    collectionId: req.collectionId,
    clientSessionId: req.clientSessionId,
    requestedByUserId: req.requestedByUserId,
    type: req.type,
    quality: req.quality,
    fingerprint,
    fileCount: photos.length,
    totalBytes: BigInt(sized.reduce((s, p) => s + p.bytes, 0)),
    expiresAt: new Date(Date.now() + ARCHIVE_TTL_HOURS * 3_600_000),
    parts: parts.map((ids) => ({ photoIds: ids, bytes: BigInt(ids.reduce((s, id) => s + (bytesById.get(id) ?? 0), 0)) })),
  });
  return { jobId: job.id };
}

export type ArchiveStatus = {
  id: string;
  status: "QUEUED" | "PROCESSING" | "READY" | "FAILED";
  fileCount: number;
  totalBytes: number;
  partsReady: number;
  parts: { index: number; status: string; bytes: number }[];
};

export function toArchiveStatus(job: ArchiveJobRow): ArchiveStatus {
  return {
    id: job.id,
    status: job.status,
    fileCount: job.fileCount,
    totalBytes: Number(job.totalBytes),
    partsReady: job.parts.filter((p) => p.status === "READY").length,
    parts: job.parts.map((p) => ({ index: p.index, status: p.status, bytes: Number(p.bytes) })),
  };
}

export function needsWork(job: ArchiveJobRow): boolean {
  return job.status === "QUEUED" || job.status === "PROCESSING";
}

/** Builds pending parts until the time budget runs out; the next poll continues. */
export async function processArchive(jobId: string): Promise<void> {
  const started = Date.now();
  let job = await findJob(prisma, jobId);
  if (!job || !needsWork(job)) return;
  if (job.status === "QUEUED") await setJobStatus(prisma, jobId, "PROCESSING");

  for (const part of job.parts) {
    if (Date.now() - started > PROCESS_BUDGET_MS) break;
    if (part.status === "READY" || !(await claimPart(prisma, part.id))) continue;

    const key = r2Keys.archivePart(job.collection.userId, job.id, part.index);
    try {
      const photos = await listReadyPhotosForArchive(prisma, job.collectionId, { photoIds: part.photoIds });
      // Photos deleted since the request are simply left out.
      await buildArchive(key, photos, job.quality);
      await finishPart(prisma, part.id, { status: "READY", zipStorageKey: key, error: null });
    } catch (error) {
      console.error("[archive] part failed", job.id, part.index, error);
      const final = part.attempts + 1 >= MAX_PART_ATTEMPTS;
      await finishPart(prisma, part.id, { status: final ? "FAILED" : "QUEUED", error: "Falha ao montar o arquivo" });
    }
  }

  job = await findJob(prisma, jobId);
  if (!job) return;
  if (job.parts.every((p) => p.status === "READY")) await setJobStatus(prisma, jobId, "READY");
  else if (job.parts.some((p) => p.status === "FAILED")) await setJobStatus(prisma, jobId, "FAILED", "Não foi possível preparar o arquivo");
}

/** Short-lived attachment URL for one READY part. */
export async function signArchivePart(job: ArchiveJobRow, index: number): Promise<string> {
  const part = job.parts.find((p) => p.index === index);
  if (!part || part.status !== "READY" || !part.zipStorageKey) throw new DomainError("NOT_READY", "Este arquivo ainda não está pronto.");
  if (job.expiresAt && job.expiresAt.getTime() < Date.now()) throw new DomainError("EXPIRED", "Este arquivo expirou. Gere um novo download.");
  const base = job.collection.title.normalize("NFD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-") || "galeria";
  const suffix = job.parts.length > 1 ? `-parte-${index + 1}-de-${job.parts.length}` : "";
  return signDownloadUrl(part.zipStorageKey, `${base}${job.type === "FAVORITES" ? "-favoritas" : ""}${suffix}.zip`);
}

export function loadJob(jobId: string) {
  return findJob(prisma, jobId);
}
