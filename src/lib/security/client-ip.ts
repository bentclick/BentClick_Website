import "server-only";
import { headers } from "next/headers";
import { hmac } from "./tokens";

/**
 * The visitor's IP. Vercel sets x-vercel-forwarded-for / x-real-ip from the
 * real connection; a client-sent X-Forwarded-For is only the last resort.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const first = (v: string | null) => v?.split(",")[0]?.trim() || null;
  return first(h.get("x-vercel-forwarded-for")) ?? first(h.get("x-real-ip")) ?? first(h.get("x-forwarded-for")) ?? "unknown";
}

/** Keyed hash of the IP: used for rate limits and analytics, never stored raw. Fails closed without the secret. */
export async function clientIpHash(): Promise<string> {
  const secret = process.env.GALLERY_TOKEN_SECRET;
  if (!secret || secret.length < 32) throw new Error("GALLERY_TOKEN_SECRET is missing or shorter than 32 characters");
  return hmac(await clientIp(), secret);
}
