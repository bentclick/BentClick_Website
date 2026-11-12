import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/r2/objects", () => ({ objectSize: vi.fn(async () => 1), readObject: vi.fn(), writeObject: vi.fn() }));
vi.mock("@/lib/images/raw-derivatives", () => ({ readableImage: vi.fn() }));

const { deliveryKeys, resolveDeliveryObject } = await import("./delivery.service");
const base = { id: "p1", userId: "u1", collectionId: "c1", mimeType: "image/jpeg", width: 8000, height: 6000, originalFilename: "a.jpg" };
const editA = "photographers/u1/collections/c1/edited/p1.tokA.jpg";
const editB = "photographers/u1/collections/c1/edited/p1.tokB.jpg";

describe("download copies", () => {
  it("are kept apart per source file, so an old edit's copy never serves a new one", async () => {
    const a = await resolveDeliveryObject({ ...base, storageKey: editA }, "WEB");
    const b = await resolveDeliveryObject({ ...base, storageKey: editB }, "WEB");
    const original = await resolveDeliveryObject({ ...base, storageKey: "photographers/u1/collections/c1/originals/p1.jpg" }, "WEB");
    expect(new Set([a.key, b.key, original.key]).size).toBe(3);
  });

  it("are all deleted with the photo or its replaced edit, old untagged ones included", async () => {
    const keys = deliveryKeys({ id: "p1", userId: "u1", collectionId: "c1", editedKey: editA });
    expect(keys).toContain((await resolveDeliveryObject({ ...base, storageKey: editA }, "WEB")).key);
    expect(keys).toContain((await resolveDeliveryObject({ ...base, storageKey: "x/originals/p1.jpg" }, "HIGH_RES")).key);
    expect(keys).toContain("photographers/u1/collections/c1/downloads/web/p1.jpg");
  });
});
