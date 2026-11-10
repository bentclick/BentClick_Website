import { describe, expect, it } from "vitest";
import { APPLY_EDIT_COMMAND, exportedFileSpec, parseEditorMessage } from "./lightcraft-messages";

describe("parseEditorMessage", () => {
  it("reads the editor's messages", () => {
    const bytes = new ArrayBuffer(2);
    expect(parseEditorMessage({ type: "lightcraft:ready", version: "0.19.0" })).toEqual({ type: "ready" });
    expect(parseEditorMessage({ type: "lightcraft:dirty", dirty: true })).toEqual({ type: "dirty", dirty: true });
    expect(parseEditorMessage({ type: "lightcraft:save", name: "a.jpg", bytes })).toEqual({ type: "save", name: "a.jpg", bytes });
    expect(parseEditorMessage({ type: "lightcraft:response", ok: false, value: "no photo selected" })).toEqual({ type: "response", ok: false, value: "no photo selected" });
  });

  it("ignores anything else", () => {
    for (const data of [null, "x", {}, { type: "other" }, { type: "lightcraft:save", name: "a.jpg" }, { type: "lightcraft:dirty", dirty: "yes" }, { type: "lightcraft:response", value: "x" }]) expect(parseEditorMessage(data)).toBeNull();
  });
});

describe("APPLY_EDIT_COMMAND", () => {
  it("asks for a full-size JPEG with a folder, which the web editor requires", () => {
    const params = JSON.parse(APPLY_EDIT_COMMAND.params);
    expect(APPLY_EDIT_COMMAND.id).toBe("app.export");
    expect(params).toMatchObject({ format: "jpeg" });
    expect(params.dir).toBeTruthy();
    for (const key of ["resize", "longEdge", "shortEdge", "width", "height", "percent", "megapixels"]) expect(params).not.toHaveProperty(key);
  });
});

describe("exportedFileSpec", () => {
  it("names the export after the photo", () => {
    expect(exportedFileSpec("DSC02248.ARW", "export-1.JPEG")).toEqual({ name: "DSC02248.jpg", type: "image/jpeg" });
    expect(exportedFileSpec("DSC02248.ARW", "x.webp")).toEqual({ name: "DSC02248.webp", type: "image/webp" });
  });

  it("refuses what clients can't receive", () => {
    expect(exportedFileSpec("a.ARW", "a.tiff")).toBeNull();
    expect(exportedFileSpec("a.ARW", "backup.zip")).toBeNull();
  });
});
