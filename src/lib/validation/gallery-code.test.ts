import { describe, expect, it } from "vitest";
import { GALLERY_SLUG_PATTERN, generateGallerySlug } from "@/lib/security/tokens";
import { parseGalleryCode } from "./gallery-code";

describe("parseGalleryCode", () => {
  it("accepts a bare code", () => {
    expect(parseGalleryCode("  7VqxN28LmK0a ")).toBe("7VqxN28LmK0a");
  });

  it("extracts the code from a gallery link", () => {
    expect(parseGalleryCode("https://bentclick.com.br/g/7VqxN28LmK0a?ref=email")).toBe("7VqxN28LmK0a");
  });

  it("rejects anything else", () => {
    expect(parseGalleryCode("../../admin")).toBeNull();
    expect(parseGalleryCode("https://x.com/g/short")).toBeNull();
  });

  it("round-trips generated slugs", () => {
    const slug = generateGallerySlug();
    expect(GALLERY_SLUG_PATTERN.test(slug)).toBe(true);
    expect(parseGalleryCode(slug)).toBe(slug);
  });
});
