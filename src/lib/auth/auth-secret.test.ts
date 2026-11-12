import { describe, expect, it } from "vitest";
import { authSecret } from "./auth-secret";

describe("authSecret", () => {
  it("stops a production server with a short secret", () => {
    expect(() => authSecret({ NODE_ENV: "production", BETTER_AUTH_SECRET: "short" })).toThrow(/32/);
  });

  it("passes a long one, and leaves a missing one to Better Auth", () => {
    expect(authSecret({ NODE_ENV: "production", BETTER_AUTH_SECRET: "x".repeat(40) })).toHaveLength(40);
    expect(authSecret({ NODE_ENV: "production" })).toBeUndefined();
    expect(authSecret({ NODE_ENV: "development", BETTER_AUTH_SECRET: "dev" })).toBe("dev");
  });
});
