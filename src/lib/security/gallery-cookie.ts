import "server-only";
import { cookies } from "next/headers";

export const CLIENT_SESSION_DAYS = 30;
const COOKIE = "bc_gallery";

/**
 * Client-session cookie, path-scoped to one gallery (/g/{slug}) so each
 * gallery has its own session and no other route ever receives it.
 */
export async function readGalleryToken(): Promise<string | null> {
  return (await cookies()).get(COOKIE)?.value ?? null;
}

/** Only callable from Server Actions / Route Handlers. */
export async function writeGalleryToken(slug: string, token: string) {
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: `/g/${slug}`,
    maxAge: CLIENT_SESSION_DAYS * 24 * 60 * 60,
  });
}
