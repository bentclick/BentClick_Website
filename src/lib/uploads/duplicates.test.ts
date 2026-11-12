import { describe, expect, it } from "vitest";
import { PENDING_REUSE_MAX_AGE_MS, planDuplicates, uploadFileKey } from "./duplicates";

const now = Date.parse("2026-11-12T12:00:00Z");
const photo = (id: string, name: string, size: number, status: string, ageMs = 60_000) => ({
  id,
  originalFilename: name,
  fileSize: BigInt(size),
  status,
  createdAt: new Date(now - ageMs),
});

describe("uploadFileKey", () => {
  it("matches the stored (sanitised) name regardless of case and path", () => {
    expect(uploadFileKey("C:\\fotos\\DSC02434.ARW", 41_000_000)).toBe(uploadFileKey("dsc02434.arw", 41_000_000n));
    expect(uploadFileKey("DSC02434.ARW", 41_000_000)).not.toBe(uploadFileKey("DSC02434.ARW", 41_000_001));
  });
});

describe("planDuplicates", () => {
  it("skips what is already in the gallery and keeps what is new", () => {
    const plan = planDuplicates(
      [
        { clientId: "a", name: "DSC1.ARW", size: 100 },
        { clientId: "b", name: "DSC2.ARW", size: 200 },
      ],
      [photo("p1", "DSC1.ARW", 100, "READY")],
      now,
    );
    expect(plan).toEqual({ duplicates: ["a"], reuse: [], fresh: ["b"] });
  });

  it("a same-named file with a different size is a different photo", () => {
    const plan = planDuplicates([{ clientId: "a", name: "IMG_0001.JPG", size: 101 }], [photo("p1", "IMG_0001.JPG", 100, "READY")], now);
    expect(plan.fresh).toEqual(["a"]);
  });

  it("counts photos still processing or that failed processing as already sent", () => {
    for (const status of ["UPLOADED", "PROCESSING", "FAILED"]) {
      const plan = planDuplicates([{ clientId: "a", name: "x.jpg", size: 1 }], [photo("p1", "x.jpg", 1, status)], now);
      expect(plan.duplicates, status).toEqual(["a"]);
    }
  });

  it("reuses the reservation left by an interrupted upload instead of reserving again", () => {
    const pending = photo("p1", "DSC3.ARW", 300, "PENDING_UPLOAD");
    const plan = planDuplicates([{ clientId: "a", name: "DSC3.ARW", size: 300 }], [pending], now);
    expect(plan.reuse).toEqual([{ clientId: "a", photo: pending }]);
  });

  it("leaves reservations near the 24 h cleanup alone", () => {
    const old = photo("p1", "DSC3.ARW", 300, "PENDING_UPLOAD", PENDING_REUSE_MAX_AGE_MS + 1);
    const plan = planDuplicates([{ clientId: "a", name: "DSC3.ARW", size: 300 }], [old], now);
    expect(plan.fresh).toEqual(["a"]);
  });

  it("the same file twice in one drop goes up once", () => {
    const plan = planDuplicates(
      [
        { clientId: "a", name: "DSC4.ARW", size: 400 },
        { clientId: "b", name: "dsc4.arw", size: 400 },
      ],
      [],
      now,
    );
    expect(plan).toEqual({ duplicates: ["b"], reuse: [], fresh: ["a"] });
  });
});
