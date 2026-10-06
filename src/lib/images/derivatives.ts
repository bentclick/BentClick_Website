import "server-only";
import sharp, { type Metadata } from "sharp";

export const THUMBNAIL_EDGE = 600;
export const PREVIEW_EDGE = 2048;
const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp"]);

export class InvalidImageError extends Error {}

export type Derivatives = {
  thumbnail: Buffer;
  preview: Buffer;
  width: number;
  height: number;
  dominantColor: string;
  format: string;
};

const toHex = (n: number) => Math.round(n).toString(16).padStart(2, "0");

/**
 * Reads the real content (magic bytes via sharp, not the declared MIME type),
 * applies EXIF orientation, strips metadata and renders WebP derivatives.
 * The original buffer is never modified.
 */
export async function renderDerivatives(original: Buffer): Promise<Derivatives> {
  let meta: Metadata;
  try {
    meta = await sharp(original, { failOn: "error" }).metadata();
  } catch {
    throw new InvalidImageError("Arquivo não é uma imagem válida");
  }
  if (!meta.format || !ACCEPTED_FORMATS.has(meta.format) || !meta.width || !meta.height) {
    throw new InvalidImageError("Arquivo não é uma imagem JPG, PNG ou WebP");
  }

  // Orientations 5–8 rotate by 90°, so the displayed width/height swap.
  const swapped = (meta.orientation ?? 1) >= 5;
  const width = swapped ? meta.height : meta.width;
  const height = swapped ? meta.width : meta.height;

  const base = () => sharp(original, { failOn: "error" }).rotate();
  const [thumbnail, preview] = await Promise.all([
    base().resize(THUMBNAIL_EDGE, THUMBNAIL_EDGE, { fit: "inside", withoutEnlargement: true }).webp({ quality: 72 }).toBuffer(),
    base().resize(PREVIEW_EDGE, PREVIEW_EDGE, { fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer(),
  ]);

  const { dominant } = await sharp(thumbnail).stats();
  return {
    thumbnail,
    preview,
    width,
    height,
    format: meta.format,
    dominantColor: `#${toHex(dominant.r)}${toHex(dominant.g)}${toHex(dominant.b)}`,
  };
}
