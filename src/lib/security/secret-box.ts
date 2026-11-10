import "server-only";
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

/**
 * Reversible encryption for the few values the photographer must read again (the gallery password),
 * unlike the argon2 hash that checks a visitor's guess. AES-256-GCM: a changed byte fails to open.
 *
 * The key is derived from GALLERY_TOKEN_SECRET with HKDF under its own label, so it is never the same key
 * as the token HMACs and needs no new deployment variable. Rotating that secret makes old values
 * unreadable (open returns null); the photographer then generates a new password.
 */
const VERSION = "v1";
const LABEL = "bentclick:gallery-password:v1";

function key(): Buffer {
  const secret = process.env.GALLERY_TOKEN_SECRET;
  if (!secret || secret.length < 32) throw new Error("GALLERY_TOKEN_SECRET is missing or shorter than 32 characters");
  return Buffer.from(hkdfSync("sha256", secret, Buffer.alloc(0), LABEL, 32));
}

/** "v1.<iv>.<tag>.<ciphertext>", base64url. */
export function sealSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [VERSION, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), body.toString("base64url")].join(".");
}

/** The plain value, or null when it can't be opened (tampered, another key, unknown format). */
export function openSecret(sealed: string | null): string | null {
  if (!sealed) return null;
  const [version, iv, tag, body] = sealed.split(".");
  if (version !== VERSION || !iv || !tag || body === undefined) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
