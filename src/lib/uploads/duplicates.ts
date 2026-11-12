import { sanitizeFilename } from "./file-types";

/**
 * Duplicate detection for uploads: same file name (as stored) + same byte size in
 * the same gallery. Camera names (DSC02434.ARW) plus an exact size are as good as
 * a hash for this, without reading hundreds of 40 MB RAW files in the browser.
 * Edits never change these fields (they live in edited*), so an edited photo still
 * matches its original.
 *
 * Why (2026-11-12): a 516-file drop was interrupted by a page refresh; the
 * photographer needs to drop the whole folder again and have the site skip what
 * already arrived, instead of sorting it by hand.
 */
export function uploadFileKey(name: string, size: number | bigint): string {
  return `${sanitizeFilename(name).toLowerCase()}|${size.toString()}`;
}

/** A reservation (PENDING_UPLOAD) older than this is left to the 24 h cleanup instead of being reused. */
export const PENDING_REUSE_MAX_AGE_MS = 20 * 60 * 60 * 1000;

export type ExistingPhoto = { id: string; originalFilename: string; fileSize: bigint; status: string; createdAt: Date };

export type IncomingFile = { clientId: string; name: string; size: number };

export type DuplicatePlan<P extends ExistingPhoto> = {
  /** Already in the gallery (uploaded, processing, ready or failed processing): skip. */
  duplicates: string[];
  /** Reserved by an interrupted upload: send the bytes to that same row. */
  reuse: { clientId: string; photo: P }[];
  /** Genuinely new. */
  fresh: string[];
};

export function planDuplicates<P extends ExistingPhoto>(files: IncomingFile[], existing: P[], now: number): DuplicatePlan<P> {
  const stored = new Set<string>();
  const pending = new Map<string, P[]>();
  for (const p of existing) {
    const key = uploadFileKey(p.originalFilename, p.fileSize);
    if (p.status !== "PENDING_UPLOAD") stored.add(key);
    else if (now - p.createdAt.getTime() < PENDING_REUSE_MAX_AGE_MS) pending.set(key, [...(pending.get(key) ?? []), p]);
  }

  const plan: DuplicatePlan<P> = { duplicates: [], reuse: [], fresh: [] };
  const seen = new Set<string>();
  for (const f of files) {
    const key = uploadFileKey(f.name, f.size);
    if (stored.has(key) || seen.has(key)) {
      plan.duplicates.push(f.clientId);
      continue;
    }
    seen.add(key);
    const reserved = pending.get(key)?.shift();
    if (reserved) plan.reuse.push({ clientId: f.clientId, photo: reserved });
    else plan.fresh.push(f.clientId);
  }
  return plan;
}
