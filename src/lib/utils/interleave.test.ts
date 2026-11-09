import { describe, expect, it } from "vitest";
import { interleave } from "./interleave";

describe("interleave", () => {
  it("alternates between groups", () => {
    expect(interleave([["a1", "a2"], ["b1", "b2"]], 4)).toEqual(["a1", "b1", "a2", "b2"]);
  });

  it("keeps going with the longer groups and stops at the limit", () => {
    expect(interleave([["a1", "a2", "a3"], ["b1"]], 3)).toEqual(["a1", "b1", "a2"]);
  });

  it("returns what exists when there are fewer items than the limit", () => {
    expect(interleave([["a1"], []], 12)).toEqual(["a1"]);
    expect(interleave([], 12)).toEqual([]);
  });
});
