/** Public client-gallery URL for a slug. Works on server and client. */
export function galleryUrl(slug: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ?? (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
  return `${base.replace(/\/$/, "")}/g/${slug}`;
}
