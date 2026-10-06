import "server-only";
import { S3Client } from "@aws-sdk/client-s3";

type R2Config = { client: S3Client; bucket: string };

let cached: R2Config | null | undefined;

/**
 * S3-compatible client for the private R2 bucket. Returns null until R2
 * credentials are configured so the dashboard still renders in local dev.
 */
export function getR2(): R2Config | null {
  if (cached !== undefined) return cached;
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
    cached = null;
    return cached;
  }
  cached = {
    bucket: R2_BUCKET,
    client: new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
    }),
  };
  return cached;
}

export function requireR2(): R2Config {
  const r2 = getR2();
  if (!r2) throw new Error("Cloudflare R2 is not configured (R2_* environment variables).");
  return r2;
}
