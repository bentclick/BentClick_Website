import { describe, expect, it } from "vitest";
import { galleryPasswordSchema, suggestGalleryPassword } from "./gallery-password";

describe("gallery password policy", () => {
  it.each(["1234", "abcdefgh", "abcdefg1", "abcdefg!", "Ab1!"])("rejects %s", (p) => {
    expect(galleryPasswordSchema.safeParse(p).success).toBe(false);
  });

  it.each(["Praia-2024!", "s3nh@forte"])("accepts %s", (p) => {
    expect(galleryPasswordSchema.safeParse(p).success).toBe(true);
  });

  it("suggests passwords that pass the policy", () => {
    for (let i = 0; i < 50; i++) expect(galleryPasswordSchema.safeParse(suggestGalleryPassword()).success).toBe(true);
  });
});
