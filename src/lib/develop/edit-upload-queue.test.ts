import { describe, expect, it, vi } from "vitest";
import { createEditUploadQueue, type UploadCounts } from "./edit-upload-queue";

const limited = new Error("429");

function setup(sleep = vi.fn(async () => {})) {
  const seen: UploadCounts[] = [];
  const failures: string[] = [];
  const queue = createEditUploadQueue({
    onChange: (c) => seen.push(c),
    onFailure: (label) => failures.push(label),
    isRateLimited: (e) => e === limited,
    sleep,
  });
  return { queue, seen, failures, sleep };
}

describe("edit upload queue", () => {
  it("uploads one at a time, in order", async () => {
    const { queue, seen } = setup();
    const order: string[] = [];
    let running = 0;
    const job = (label: string) => ({
      label,
      run: async () => {
        running++;
        expect(running).toBe(1);
        await Promise.resolve();
        order.push(label);
        running--;
      },
    });
    queue.add(job("a"));
    await queue.add(job("b"));
    expect(order).toEqual(["a", "b"]);
    expect(seen.at(-1)).toEqual({ pending: 0, saved: 2, failed: 0 });
  });

  it("waits and retries the same photo when rate limited", async () => {
    const { queue, seen, sleep } = setup();
    const run = vi.fn().mockRejectedValueOnce(limited).mockResolvedValueOnce(undefined);
    await queue.add({ label: "a", run });
    expect(run).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledOnce();
    expect(seen.at(-1)).toEqual({ pending: 0, saved: 1, failed: 0 });
  });

  it("counts a failure and goes on with the next photo", async () => {
    const { queue, seen, failures } = setup();
    queue.add({ label: "a", run: () => Promise.reject(new Error("boom")) });
    await queue.add({ label: "b", run: async () => {} });
    expect(failures).toEqual(["a"]);
    expect(seen.at(-1)).toEqual({ pending: 0, saved: 1, failed: 1 });
  });

  it("gives up after the retries", async () => {
    const { queue, failures, sleep } = setup();
    await queue.add({ label: "a", run: () => Promise.reject(limited) });
    expect(sleep).toHaveBeenCalledTimes(4);
    expect(failures).toEqual(["a"]);
  });
});
