import { describe, expect, it } from "vitest";
import { checkEditedFile } from "./file-types";
import { matchEditedFiles } from "./match-edited";

const file = (name: string) => ({ name });
const photos = [
  { id: "a", filename: "DSC03035.ARW" },
  { id: "b", filename: "DSC03036.ARW" },
  { id: "c", filename: "dup.CR3" },
  { id: "d", filename: "dup.jpg" },
];

describe("matchEditedFiles", () => {
  it("matches by name, ignoring extension and case", () => {
    expect(matchEditedFiles([file("dsc03035.jpg")], photos).matched).toEqual([{ photoId: "a", file: file("dsc03035.jpg") }]);
  });

  it("reports files with no photo", () => {
    expect(matchEditedFiles([file("outra.jpg")], photos).unmatched).toEqual([file("outra.jpg")]);
  });

  it("refuses to guess when two photos share a name", () => {
    const result = matchEditedFiles([file("dup.webp")], photos);
    expect(result.matched).toEqual([]);
    expect(result.ambiguous).toEqual([file("dup.webp")]);
  });

  it("refuses to guess when two files target one photo", () => {
    const result = matchEditedFiles([file("DSC03036.jpg"), file("DSC03036.png")], photos);
    expect(result.matched).toEqual([]);
    expect(result.ambiguous).toHaveLength(2);
  });
});

describe("checkEditedFile", () => {
  it("accepts finished images and refuses RAW", () => {
    expect(checkEditedFile({ name: "a.jpg", type: "image/jpeg", size: 10 }).ok).toBe(true);
    expect(checkEditedFile({ name: "a.arw", type: "", size: 10 })).toEqual({ ok: false, reason: "Envie a versão editada em JPG, PNG ou WebP" });
  });
});
