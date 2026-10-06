import { describe, expect, it } from "vitest";
import { PART_MAX_BYTES, planArchiveParts, uniqueEntryNames } from "./archive-plan";

const MB = 1024 * 1024;
const photos = (n: number, bytes: number) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, bytes }));

describe("planArchiveParts", () => {
  it("keeps a small gallery in one part", () => {
    expect(planArchiveParts(photos(50, 10 * MB), "ORIGINAL")).toHaveLength(1);
  });

  it("splits by size", () => {
    const parts = planArchiveParts(photos(300, 10 * MB), "ORIGINAL"); // 3 GB
    expect(parts.length).toBe(3);
    expect(parts.flat()).toHaveLength(300);
  });

  it("splits re-rendered qualities by file count", () => {
    expect(planArchiveParts(photos(250, MB), "HIGH_RES").map((p) => p.length)).toEqual([120, 120, 10]);
  });

  it("never leaves an oversized file without a part", () => {
    const parts = planArchiveParts([{ id: "big", bytes: PART_MAX_BYTES + 1 }, { id: "small", bytes: MB }], "ORIGINAL");
    expect(parts).toEqual([["big"], ["small"]]);
  });
});

describe("uniqueEntryNames", () => {
  it("disambiguates duplicates and strips unsafe characters", () => {
    expect(uniqueEntryNames(["DSC_1.jpg", "dsc_1.JPG", "a/b.jpg", "DSC_1.jpg"])).toEqual(["DSC_1.jpg", "dsc_1 (2).JPG", "a_b.jpg", "DSC_1 (3).jpg"]);
  });
});
