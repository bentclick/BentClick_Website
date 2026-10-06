import { createHash, createHmac, randomBytes, randomInt } from "node:crypto";

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** Unbiased base62 string from a CSPRNG. 12 chars ≈ 71 bits of entropy. */
export function randomBase62(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) out += BASE62[randomInt(BASE62.length)];
  return out;
}

export const GALLERY_SLUG_LENGTH = 12;
export const GALLERY_SLUG_PATTERN = /^[0-9A-Za-z]{12}$/;

export function generateGallerySlug(): string {
  return randomBase62(GALLERY_SLUG_LENGTH);
}

/** Opaque bearer token for client-session cookies. Only its hash is stored. */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Keyed hash for IPs so analytics never store raw addresses. */
export function hmac(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}
