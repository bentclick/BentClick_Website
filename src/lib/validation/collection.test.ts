import { describe, expect, it } from "vitest";
import { createCollectionSchema, type CreateCollectionInput } from "./collection";
import { suggestGalleryPassword } from "./gallery-password";

const input = (over: Partial<CreateCollectionInput>): CreateCollectionInput => ({
  title: "Batizado",
  client: { mode: "none" },
  eventDate: "",
  category: "WEDDING",
  expiryPreset: "30",
  customExpiry: "",
  isPrivate: true,
  requirePassword: true,
  password: suggestGalleryPassword(),
  allowFavorites: true,
  allowIndividualDownload: true,
  allowFullDownload: false,
  allowSharing: true,
  downloadQuality: "HIGH_RES",
  watermarkId: "",
  ...over,
});

describe("createCollectionSchema password", () => {
  it("accepts the generated password", () => {
    expect(createCollectionSchema.safeParse(input({})).success).toBe(true);
  });

  it("holds a typed password to the same policy as Configurações", () => {
    const result = createCollectionSchema.safeParse(input({ password: "1234" }));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["password"]);
  });

  it("ignores the field when no password is required", () => {
    expect(createCollectionSchema.safeParse(input({ requirePassword: false, password: "" })).success).toBe(true);
  });
});
