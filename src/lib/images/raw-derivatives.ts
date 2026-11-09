import "server-only";
import sharp from "sharp";
import { RAW_MIME_TYPE } from "@/lib/uploads/file-types";
import { type Derivatives, InvalidImageError, renderDerivatives } from "./derivatives";
import { findLargestEmbeddedJpeg, readRawOrientation } from "./raw-preview";

const ROTATION: Record<number, number> = { 3: 180, 6: 90, 8: 270 };

/** The camera's own JPEG, turned upright. It is a display copy: the RAW is never altered. */
async function extractPreview(raw: Buffer): Promise<Buffer> {
  const found = findLargestEmbeddedJpeg(raw);
  if (!found) throw new InvalidImageError("Este RAW não traz uma prévia embutida. Envie uma versão em JPG.");
  const jpeg = raw.subarray(found.start, found.end);

  const degrees = ROTATION[readRawOrientation(raw) ?? 1];
  if (!degrees) return jpeg;
  // Some cameras also tag the JPEG itself; renderDerivatives honours that tag, so rotating too would turn it twice.
  const own = await sharp(jpeg).metadata().catch(() => null);
  if (own?.orientation && own.orientation > 1) return jpeg;
  return sharp(jpeg).rotate(degrees).jpeg({ quality: 95 }).toBuffer();
}

/** Derivatives for any stored original, RAW included. */
export async function renderOriginal(original: Buffer, mimeType: string): Promise<Derivatives> {
  return renderDerivatives(mimeType === RAW_MIME_TYPE ? await extractPreview(original) : original);
}
