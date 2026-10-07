import "server-only";
import sharp from "sharp";

export type DownloadVariant = "high" | "web";

/** Long edge per delivery quality (docs: "High resolution" / "Web optimised"). */
export const VARIANT_EDGE: Record<DownloadVariant, number> = { high: 3600, web: 2048 };
const VARIANT_QUALITY: Record<DownloadVariant, number> = { high: 90, web: 85 };

/** Whether the original is already small enough to be delivered as the variant itself. */
export function originalSatisfies(variant: DownloadVariant, mimeType: string, width: number | null, height: number | null): boolean {
  return mimeType === "image/jpeg" && width !== null && height !== null && Math.max(width, height) <= VARIANT_EDGE[variant];
}

/** sRGB JPEG with orientation applied; metadata (GPS etc.) stripped. */
export function renderDownloadVariant(original: Buffer, variant: DownloadVariant): Promise<Buffer> {
  const edge = VARIANT_EDGE[variant];
  return sharp(original, { failOn: "error", limitInputPixels: 200_000_000 })
    .rotate()
    .resize(edge, edge, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: VARIANT_QUALITY[variant], mozjpeg: true })
    .toBuffer();
}

/** Download filename: original name, extension adjusted when the content changed. */
export function deliveredFilename(originalFilename: string, converted: boolean): string {
  if (!converted) return originalFilename;
  const dot = originalFilename.lastIndexOf(".");
  return `${dot > 0 ? originalFilename.slice(0, dot) : originalFilename}.jpg`;
}
