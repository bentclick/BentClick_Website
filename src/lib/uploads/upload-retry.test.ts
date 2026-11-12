import { describe, expect, it } from "vitest";
import { UploadApiError } from "./upload-api";
import { isTransient, needsFreshUrl, RETRY_DELAYS_MS, URL_FRESH_MS, withRetry } from "./upload-retry";

describe("upload retry policy", () => {
  it("treats network drops, refused URLs, rate limits and server errors as worth another try", () => {
    for (const status of [0, 403, 408, 429, 500, 503]) expect(isTransient(new UploadApiError("x", status)), String(status)).toBe(true);
    for (const status of [400, 401, 404, 413, 422]) expect(isTransient(new UploadApiError("x", status)), String(status)).toBe(false);
    expect(isTransient(new Error("x"))).toBe(false);
  });

  it("renews a URL well before its 15-minute expiry", () => {
    expect(URL_FRESH_MS).toBeLessThan(15 * 60_000);
    expect(needsFreshUrl(undefined, 0)).toBe(true);
    expect(needsFreshUrl(0, URL_FRESH_MS)).toBe(false);
    expect(needsFreshUrl(0, URL_FRESH_MS + 1)).toBe(true);
  });

  it("outlasts a one-minute rate-limit window, then gives up", async () => {
    expect(RETRY_DELAYS_MS.reduce((a, b) => a + b, 0)).toBeGreaterThan(60_000);
    const waits: number[] = [];
    const fail = () => Promise.reject(new UploadApiError("Muitas requisições", 429));
    await expect(withRetry(fail, async (ms) => void waits.push(ms))).rejects.toThrow();
    expect(waits).toEqual([...RETRY_DELAYS_MS]);
  });

  it("does not retry a permanent refusal", async () => {
    let calls = 0;
    const quota = () => {
      calls++;
      return Promise.reject(new UploadApiError("Espaço insuficiente", 422));
    };
    await expect(withRetry(quota, async () => undefined)).rejects.toThrow();
    expect(calls).toBe(1);
  });
});
