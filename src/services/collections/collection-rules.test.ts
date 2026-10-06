import { describe, expect, it } from "vitest";
import { daysUntil, effectiveStatus, publishIssues, resolveExpiry } from "./collection-rules";

const now = new Date("2026-10-06T12:00:00.000Z");

describe("resolveExpiry", () => {
  it("returns null for never", () => {
    expect(resolveExpiry("never", "", now)).toBeNull();
  });

  it("adds preset days", () => {
    expect(resolveExpiry("30", "", now)?.toISOString()).toBe("2026-11-05T12:00:00.000Z");
  });

  it("uses end of day for custom dates", () => {
    expect(resolveExpiry("custom", "2026-12-24", now)?.toISOString()).toBe("2026-12-24T23:59:59.999Z");
  });
});

describe("effectiveStatus", () => {
  it("flips published to expired once past expiry", () => {
    expect(effectiveStatus("PUBLISHED", new Date("2026-10-01"), now)).toBe("EXPIRED");
  });

  it("keeps drafts as drafts even if the date passed", () => {
    expect(effectiveStatus("DRAFT", new Date("2026-10-01"), now)).toBe("DRAFT");
  });

  it("keeps published without expiry", () => {
    expect(effectiveStatus("PUBLISHED", null, now)).toBe("PUBLISHED");
  });
});

describe("publishIssues", () => {
  it("requires photos and a cover", () => {
    expect(publishIssues({ status: "DRAFT", readyPhotoCount: 0, coverPhotoId: null, expiresAt: null }, now)).toEqual([
      "NO_PHOTOS",
      "NO_COVER",
    ]);
  });

  it("passes a ready collection", () => {
    expect(publishIssues({ status: "DRAFT", readyPhotoCount: 12, coverPhotoId: "p1", expiresAt: null }, now)).toEqual([]);
  });

  it("rejects an expiry in the past", () => {
    const issues = publishIssues(
      { status: "EXPIRED", readyPhotoCount: 3, coverPhotoId: "p1", expiresAt: new Date("2026-09-01") },
      now,
    );
    expect(issues).toContain("EXPIRY_IN_PAST");
  });
});

describe("daysUntil", () => {
  it("rounds up partial days", () => {
    expect(daysUntil(new Date("2026-10-07T00:00:00.000Z"), now)).toBe(1);
  });
});
