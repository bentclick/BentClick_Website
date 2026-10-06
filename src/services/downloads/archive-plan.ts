import type { DownloadQuality } from "@/generated/prisma/enums";

/**
 * Each part must be packed within one function invocation (~5 min budget):
 * originals are streamed byte-for-byte, other qualities are re-rendered first,
 * so those parts carry far fewer photos.
 */
export const PART_MAX_BYTES = 1024 * 1024 * 1024; // 1 GB
export const PART_MAX_FILES: Record<DownloadQuality, number> = { ORIGINAL: 400, HIGH_RES: 120, WEB: 200 };

export function planArchiveParts(photos: { id: string; bytes: number }[], quality: DownloadQuality): string[][] {
  const parts: string[][] = [];
  let current: string[] = [];
  let size = 0;
  for (const photo of photos) {
    const full = current.length >= PART_MAX_FILES[quality] || (current.length > 0 && size + photo.bytes > PART_MAX_BYTES);
    if (full) {
      parts.push(current);
      current = [];
      size = 0;
    }
    current.push(photo.id);
    size += photo.bytes;
  }
  if (current.length) parts.push(current);
  return parts;
}

/** Unique, filesystem-safe names inside the ZIP (two "DSC_0001.jpg" become "DSC_0001 (2).jpg"). */
export function uniqueEntryNames(names: string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((raw) => {
    const name = raw.replace(/[\\/:*?"<>|]/g, "_") || "foto.jpg";
    const key = name.toLowerCase();
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    if (n === 1) return name;
    const dot = name.lastIndexOf(".");
    return dot > 0 ? `${name.slice(0, dot)} (${n})${name.slice(dot)}` : `${name} (${n})`;
  });
}
