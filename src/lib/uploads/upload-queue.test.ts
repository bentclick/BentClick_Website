import { describe, expect, it } from "vitest";
import { type UploadAdapter, UploadApiError } from "./upload-api";
import { PRESIGN_BATCH, type UploadItem, UploadQueue } from "./upload-queue";
import { URL_FRESH_MS } from "./upload-retry";

const jpeg = (i: number) => new File([new Uint8Array(10)], `IMG_${i}.jpg`, { type: "image/jpeg" });

/** Fake server: counts calls, issues versioned URLs, and lets a test inject failures. */
function harness(opts: { put?: (url: string) => Promise<void>; presignFails?: number } = {}) {
  const calls = { presign: [] as number[], resign: 0, put: [] as string[] };
  let version = 0;
  let presignFails = opts.presignFails ?? 0;
  const api: UploadAdapter = {
    presign: async (files) => {
      if (presignFails-- > 0) throw new UploadApiError("Muitas requisições", 429);
      calls.presign.push(files.length);
      return { uploads: files.map((f) => ({ clientId: f.clientId, photoId: `p-${f.clientId}`, url: `put://${f.clientId}/v${++version}`, contentType: f.type })), rejected: [] };
    },
    resign: async (id) => {
      calls.resign++;
      return { url: `put://${id}/v${++version}`, contentType: "image/jpeg" };
    },
    complete: async (ids) => ({ completed: ids, failed: [] }),
    process: async () => ({ status: "READY" }),
  };
  let clock = 0;
  const idle: { done: number; failed: number }[] = [];
  const queue = new UploadQueue(
    api,
    { onIdle: (s) => idle.push(s) },
    {
      put: async (url) => {
        calls.put.push(url);
        await (opts.put?.(url) ?? Promise.resolve());
      },
      sleep: async () => undefined,
      now: () => clock,
    },
  );
  let items: UploadItem[] = [];
  queue.subscribe(() => (items = queue.getSnapshot()));
  const settle = async () => {
    for (let i = 0; i < 200 && idle.length === 0; i++) await new Promise((r) => setTimeout(r, 20));
  };
  return { queue, calls, idle, settle, advance: (ms: number) => (clock += ms), items: () => items };
}

describe("UploadQueue", () => {
  it("asks for upload URLs in small lots, never the whole drop at once", async () => {
    const h = harness();
    h.queue.add(Array.from({ length: 40 }, (_, i) => jpeg(i)));
    await h.settle();
    expect(h.idle[0]).toEqual({ done: 40, failed: 0 });
    expect(Math.max(...h.calls.presign)).toBeLessThanOrEqual(PRESIGN_BATCH);
    expect(h.calls.presign.length).toBeGreaterThanOrEqual(40 / PRESIGN_BATCH);
  });

  it("retries a dropped PUT with a fresh URL (an expired one looks like a network error)", async () => {
    const dead = new Set<string>();
    const h = harness({
      put: async (url) => {
        if (url.endsWith("/v1") && !dead.has(url)) {
          dead.add(url);
          throw new UploadApiError("Falha de rede durante o envio", 0);
        }
      },
    });
    h.queue.add([jpeg(1)]);
    await h.settle();
    expect(h.idle[0]).toEqual({ done: 1, failed: 0 });
    expect(h.calls.resign).toBe(1);
    expect(h.calls.put.at(-1)).not.toMatch(/\/v1$/); // the retry did not reuse the dead URL
  });

  it("renews a URL that waited too long in the queue before using it", async () => {
    let first = true;
    const h = harness({
      put: async () => {
        if (first) {
          first = false;
          h.advance(URL_FRESH_MS + 1); // the first file took longer than the URL margin
        }
      },
    });
    h.queue.add(Array.from({ length: 12 }, (_, i) => jpeg(i)));
    await h.settle();
    expect(h.idle[0]).toEqual({ done: 12, failed: 0 });
    expect(h.calls.resign).toBeGreaterThan(0);
  });

  it("waits out a rate limit instead of failing the batch", async () => {
    const h = harness({ presignFails: 2 });
    h.queue.add([jpeg(1), jpeg(2)]);
    await h.settle();
    expect(h.idle[0]).toEqual({ done: 2, failed: 0 });
  });

  it("gives what still failed one more automatic pass when the queue drains", async () => {
    let failures = 6; // more than the per-file retries
    const h = harness({
      put: async () => {
        if (failures-- > 0) throw new UploadApiError("Falha de rede durante o envio", 0);
      },
    });
    h.queue.add([jpeg(1)]);
    await h.settle();
    expect(h.idle[0]).toEqual({ done: 1, failed: 0 });
  });

  it("does not loop forever on a file that keeps failing", async () => {
    const h = harness({
      put: async () => {
        throw new UploadApiError("Armazenamento recusou o envio (400)", 400);
      },
    });
    h.queue.add([jpeg(1)]);
    await h.settle();
    expect(h.idle[0]).toEqual({ done: 0, failed: 1 });
    expect(h.calls.put).toHaveLength(2); // the first try plus one sweep
    h.queue.retryFailed(); // the photographer can still ask again
    await new Promise((r) => setTimeout(r, 50));
    expect(h.calls.put).toHaveLength(3);
  });
});
