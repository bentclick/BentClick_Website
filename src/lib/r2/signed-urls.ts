import "server-only";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2 } from "./client";

const DISPLAY_WINDOW_SECONDS = 6 * 60 * 60;
export const DOWNLOAD_URL_TTL_SECONDS = 10 * 60;

/**
 * Signed URL for thumbnails / previews. The signing date is floored to a
 * 6-hour window so the same URL is produced across requests (browser-cacheable),
 * and it stays valid for at least one full window.
 */
export async function signDisplayUrl(key: string | null | undefined): Promise<string | null> {
  const r2 = getR2();
  if (!r2 || !key) return null;
  const windowMs = DISPLAY_WINDOW_SECONDS * 1000;
  const signingDate = new Date(Math.floor(Date.now() / windowMs) * windowMs);
  return getSignedUrl(r2.client, new GetObjectCommand({ Bucket: r2.bucket, Key: key }), {
    signingDate,
    expiresIn: DISPLAY_WINDOW_SECONDS * 2,
  });
}

/** Short-lived attachment URL for authorised downloads (originals, ZIPs). */
export async function signDownloadUrl(key: string, filename: string): Promise<string> {
  const r2 = getR2();
  if (!r2) throw new Error("Cloudflare R2 is not configured.");
  const safeName = filename.replace(/["\\\r\n]/g, "_");
  return getSignedUrl(
    r2.client,
    new GetObjectCommand({
      Bucket: r2.bucket,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${safeName}"`,
    }),
    { expiresIn: DOWNLOAD_URL_TTL_SECONDS },
  );
}
