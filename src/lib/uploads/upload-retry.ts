import { UploadApiError } from "./upload-api";

/**
 * Retry policy for the upload queue.
 *
 * What broke (2026-11-12): 516 RAW files were all presigned up front; the PUT URLs
 * live 15 min (UPLOAD_URL_TTL_SECONDS), so files further down the queue reached
 * storage with an expired URL. R2 answers that 403 without CORS headers, which the
 * browser reports as a network error (status 0) — and the old retries reused the
 * same dead URL. Clicking retry worked because it asked for a fresh URL.
 */

/** Waits between attempts: quick for a blip, long enough to outlast a rate-limit window (60 s). */
export const RETRY_DELAYS_MS = [2_000, 5_000, 15_000, 30_000, 60_000] as const;

/** A URL older than this is renewed before the PUT (TTL is 15 min; keep a margin for the transfer itself). */
export const URL_FRESH_MS = 8 * 60_000;

export function retryDelay(attempt: number): number | null {
  return RETRY_DELAYS_MS[attempt] ?? null;
}

/** Errors that a later attempt can fix: network drop, expired/refused URL, rate limit, server hiccup. */
export function isTransient(error: unknown): boolean {
  if (!(error instanceof UploadApiError)) return false;
  const s = error.status;
  return s === 0 || s === 403 || s === 408 || s === 429 || s >= 500;
}

export function needsFreshUrl(urlAt: number | undefined, now: number): boolean {
  return urlAt === undefined || now - urlAt > URL_FRESH_MS;
}

/** Runs `fn`, retrying transient failures with growing waits; permanent ones (quota, 401, 404) throw at once. */
export async function withRetry<T>(fn: () => Promise<T>, sleep: (ms: number) => Promise<void>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const wait = isTransient(e) ? retryDelay(attempt) : null;
      if (wait === null) throw e;
      await sleep(wait);
    }
  }
}

/** Default pause: waits the delay, then for the connection to come back if the browser is offline. */
export async function pause(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
  if (typeof navigator !== "undefined" && typeof window !== "undefined" && navigator.onLine === false) {
    await new Promise<void>((r) => window.addEventListener("online", () => r(), { once: true }));
  }
}
