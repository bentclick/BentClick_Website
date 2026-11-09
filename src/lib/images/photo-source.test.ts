import { describe, expect, it } from "vitest";
import { clientDeliverable, displaySource, editToken, previewVersion } from "./photo-source";

const RAW = { storageKey: "o/a.arw", mimeType: "application/octet-stream", originalFilename: "a.arw", fileSize: 100n };
const NOT_EDITED = { ...RAW, editedKey: null, editedMimeType: null, editedFilename: null, editedFileSize: null };
const EDITED = { ...RAW, editedKey: "c/edited/p1.tok9.jpg", editedMimeType: "image/jpeg", editedFilename: "a.jpg", editedFileSize: 40n };

describe("displaySource", () => {
  it("uses the edited file when there is one", () => {
    expect(displaySource(EDITED)).toEqual({ key: EDITED.editedKey, mimeType: "image/jpeg" });
    expect(displaySource(NOT_EDITED)).toEqual({ key: "o/a.arw", mimeType: RAW.mimeType });
  });
});

describe("previewVersion", () => {
  it("is unique per edit and keeps the watermark stamp", () => {
    expect(editToken(EDITED.editedKey)).toBe("tok9");
    expect(previewVersion(EDITED.editedKey, "w:1")).toBe("tok9-w:1");
    expect(previewVersion(EDITED.editedKey, null)).toBe("tok9");
  });

  it("goes back to the original's keys without an edit", () => {
    expect(previewVersion(null, "w:1")).toBe("w:1");
    expect(previewVersion(null, null)).toBeNull();
  });
});

describe("clientDeliverable", () => {
  it("hands clients the edited file, size and name", () => {
    expect(clientDeliverable(EDITED)).toMatchObject({ storageKey: EDITED.editedKey, mimeType: "image/jpeg", originalFilename: "a.jpg", fileSize: 40n });
  });

  it("leaves unedited photos alone", () => {
    expect(clientDeliverable(NOT_EDITED)).toBe(NOT_EDITED);
  });
});
