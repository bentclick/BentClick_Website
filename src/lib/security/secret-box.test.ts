import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const SECRET = "a".repeat(40);

describe("secret-box", () => {
  beforeEach(() => vi.stubEnv("GALLERY_TOKEN_SECRET", SECRET));
  afterEach(() => vi.unstubAllEnvs());

  it("opens what it sealed, with a new nonce each time", async () => {
    const { openSecret, sealSecret } = await import("./secret-box");
    const a = sealSecret("Praia-Sol-1234!");
    const b = sealSecret("Praia-Sol-1234!");
    expect(a).not.toBe(b);
    expect(a).not.toContain("Praia");
    expect(openSecret(a)).toBe("Praia-Sol-1234!");
  });

  it("refuses a changed value, another key or no value", async () => {
    const { openSecret, sealSecret } = await import("./secret-box");
    const sealed = sealSecret("Praia-Sol-1234!");
    const [v, iv, tag, body] = sealed.split(".");
    const flipped = `${body![0] === "A" ? "B" : "A"}${body!.slice(1)}`;
    expect(openSecret([v, iv, tag, flipped].join("."))).toBeNull();
    expect(openSecret("garbage")).toBeNull();
    expect(openSecret(null)).toBeNull();
    vi.stubEnv("GALLERY_TOKEN_SECRET", "b".repeat(40));
    expect(openSecret(sealed)).toBeNull();
  });

  it("fails closed without the secret", async () => {
    const { sealSecret } = await import("./secret-box");
    vi.stubEnv("GALLERY_TOKEN_SECRET", "");
    expect(() => sealSecret("x")).toThrow(/GALLERY_TOKEN_SECRET/);
  });
});
