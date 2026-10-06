import { describe, expect, it } from "vitest";
import { checkFile, sanitizeFilename } from "./file-types";

const MB = 1024 * 1024;

describe("checkFile", () => {
  it("accepts JPEG and maps the extension from the MIME type", () => {
    expect(checkFile({ name: "DSC_1024.JPEG", type: "image/jpeg", size: 8 * MB })).toEqual({
      ok: true,
      kind: "image",
      extension: "jpg",
      mimeType: "image/jpeg",
    });
  });

  it("detects RAW by extension even without a MIME type", () => {
    const result = checkFile({ name: "IMG_0001.CR3", type: "", size: 40 * MB });
    expect(result.ok && result.kind).toBe("raw");
  });

  it("rejects unsupported formats", () => {
    expect(checkFile({ name: "video.mp4", type: "video/mp4", size: MB }).ok).toBe(false);
    expect(checkFile({ name: "fake.jpg", type: "text/html", size: MB }).ok).toBe(false);
  });

  it("enforces size limits", () => {
    expect(checkFile({ name: "big.jpg", type: "image/jpeg", size: 201 * MB }).ok).toBe(false);
    expect(checkFile({ name: "big.nef", type: "", size: 151 * MB }).ok).toBe(false);
    expect(checkFile({ name: "empty.png", type: "image/png", size: 0 }).ok).toBe(false);
  });
});

describe("sanitizeFilename", () => {
  it("strips paths and unsafe characters", () => {
    expect(sanitizeFilename("C:\\fotos\\casamento/DSC 1024?.jpg")).toBe("DSC 1024.jpg");
    expect(sanitizeFilename('<script>"x".png')).toBe("scriptx.png");
  });

  it("never returns an empty name", () => {
    expect(sanitizeFilename("///")).toBe("foto");
  });
});
