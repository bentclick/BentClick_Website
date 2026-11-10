import { describe, expect, it } from "vitest";
import { photoOfExport, withOpenNames } from "./develop-batch";

const photos = (...names: string[]) => names.map((filename, i) => ({ photoId: `p${i}`, filename }));

describe("withOpenNames", () => {
  it("keeps unique names as they are", () => {
    expect(withOpenNames(photos("A.ARW", "B.ARW")).map((p) => p.openName)).toEqual(["A.ARW", "B.ARW"]);
  });

  it("separates photos that would export under one name", () => {
    expect(withOpenNames(photos("DSC.ARW", "dsc.jpg", "DSC.ARW")).map((p) => p.openName)).toEqual(["DSC.ARW", "dsc_2.jpg", "DSC_3.ARW"]);
  });

  it("doesn't hand out the real name of another photo", () => {
    expect(withOpenNames(photos("DSC.ARW", "DSC.jpg", "DSC_2.jpg")).map((p) => p.openName)).toEqual(["DSC.ARW", "DSC_3.jpg", "DSC_2.jpg"]);
  });
});

describe("photoOfExport", () => {
  const opened = withOpenNames(photos("DSC.ARW", "DSC.jpg", "IMG-1.CR3"));

  it("finds the photo by its export's name", () => {
    expect(photoOfExport(opened, "DSC.jpg")?.photoId).toBe("p0");
    expect(photoOfExport(opened, "dsc_2.jpg")?.photoId).toBe("p1");
    expect(photoOfExport(opened, "IMG-1.jpg")?.photoId).toBe("p2");
  });

  it("follows the editor's suffix for a repeated export", () => {
    expect(photoOfExport(opened, "DSC-2.jpg")?.photoId).toBe("p0");
    expect(photoOfExport(opened, "DSC_2-3.jpg")?.photoId).toBe("p1");
  });

  it("refuses files that aren't photos of the session", () => {
    expect(photoOfExport(opened, "LC00312.jpg")).toBeNull();
    expect(photoOfExport(opened, "DS.jpg")).toBeNull();
  });
});
