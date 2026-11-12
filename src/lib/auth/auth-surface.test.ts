import { describe, expect, it, vi } from "vitest";
import { CLOSED_AUTH_MESSAGE, closedAuthReason, FRESH_SESSION_PATHS, OPEN_AUTH_PATHS } from "./auth-surface";

vi.mock("server-only", () => ({}));

describe("closedAuthReason", () => {
  it("lets the screens' own calls through", () => {
    for (const path of ["/sign-in/email", "/two-factor/verify-totp", "/two-factor/verify-backup-code", "/reset-password/:token", "/change-password"]) {
      expect(closedAuthReason(path, {})).toBeNull();
    }
    expect(closedAuthReason("/two-factor/enable", { password: "x" })).toBeNull();
    expect(closedAuthReason("/two-factor/enable", { method: "totp" })).toBeNull();
  });

  it("refuses ways around the password or the authenticator", () => {
    for (const path of ["/two-factor/get-totp-uri", "/two-factor/send-otp", "/two-factor/verify-otp", "/update-session", "/sign-in/social", "/a-route-from-the-next-version"]) {
      expect(closedAuthReason(path, {})).toBe(CLOSED_AUTH_MESSAGE);
    }
  });

  it("refuses trusting the device and a second factor other than the app", () => {
    expect(closedAuthReason("/two-factor/verify-totp", { code: "123456", trustDevice: true })).not.toBeNull();
    expect(closedAuthReason("/two-factor/verify-backup-code", { code: "x", trustDevice: true })).not.toBeNull();
    expect(closedAuthReason("/two-factor/enable", { method: "otp" })).not.toBeNull();
  });
});

describe("FRESH_SESSION_PATHS", () => {
  it("covers every path that hands out, replaces or removes a credential", () => {
    for (const path of ["/two-factor/enable", "/two-factor/disable", "/two-factor/generate-backup-codes", "/change-password"]) {
      expect(FRESH_SESSION_PATHS.has(path), path).toBe(true);
      expect(OPEN_AUTH_PATHS.has(path), path).toBe(true);
    }
  });
});

describe("the installed Better Auth", () => {
  it("mounts nothing outside the allowlist that we haven't decided about", async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "s".repeat(40));
    vi.stubEnv("BETTER_AUTH_URL", "https://bentclick.test");
    vi.stubEnv("DATABASE_URL", "postgresql://u:p@127.0.0.1:1/db");
    const { auth } = await import("./auth");
    const mounted = new Set(
      Object.values(auth.api as Record<string, { path?: string; options?: { metadata?: { SERVER_ONLY?: boolean } } }>)
        .filter((e) => typeof e?.path === "string" && !e.options?.metadata?.SERVER_ONLY)
        .map((e) => e.path as string),
    );
    // Every open path must exist (a rename upstream would break a screen), and the closed ones are the known set:
    // when an upgrade adds a route, this list changes and someone has to decide about it.
    for (const path of OPEN_AUTH_PATHS) expect(mounted, path).toContain(path);
    const closed = [...mounted].filter((p) => !OPEN_AUTH_PATHS.has(p)).sort();
    expect(closed).toMatchSnapshot();
  }, 30_000); // loading Better Auth and its plugins takes seconds under a full parallel run
});
