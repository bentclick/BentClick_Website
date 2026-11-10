import { describe, expect, it } from "vitest";
import type { EditorPhoto } from "@/types/photo";
import { viewablePhotos } from "./viewer-photos";

const photo = (over: Partial<EditorPhoto>): EditorPhoto => ({
  id: "p1",
  filename: "DSC0001.ARW",
  status: "READY",
  width: 6000,
  height: 4000,
  sizeBytes: 1,
  thumbnailUrl: "https://t/1",
  previewUrl: "https://p/1",
  color: null,
  isRaw: true,
  isEdited: false,
  failureReason: null,
  ...over,
});

describe("viewablePhotos", () => {
  it("shows ready photos with their preview, in grid order", () => {
    const shown = viewablePhotos([photo({ id: "a" }), photo({ id: "b", previewUrl: null })]);
    expect(shown.map((p) => [p.id, p.previewUrl])).toEqual([
      ["a", "https://p/1"],
      ["b", "https://t/1"],
    ]);
  });

  it("skips photos still processing, failed or without a thumbnail", () => {
    expect(viewablePhotos([photo({ status: "PROCESSING" }), photo({ status: "FAILED" }), photo({ thumbnailUrl: null })])).toEqual([]);
  });
});
