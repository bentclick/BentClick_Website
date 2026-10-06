import { describe, expect, it } from "vitest";
import { type AccessInput, decideAccess } from "./access-rules";

const now = new Date("2026-10-06T12:00:00Z");
const future = new Date("2026-12-01T00:00:00Z");
const past = new Date("2026-10-01T00:00:00Z");

const base: AccessInput = {
  status: "PUBLISHED",
  linkEnabled: true,
  expiresAt: null,
  hasPassword: false,
  accessVersion: 1,
  ownerPreview: false,
  session: null,
};

describe("decideAccess", () => {
  it("grants a published gallery without password", () => {
    expect(decideAccess(base, now)).toEqual({ kind: "GRANTED", preview: false, sessionValid: false });
  });

  it("hides drafts, archived galleries and disabled links", () => {
    expect(decideAccess({ ...base, status: "DRAFT" }, now).kind).toBe("NOT_FOUND");
    expect(decideAccess({ ...base, status: "ARCHIVED" }, now).kind).toBe("NOT_FOUND");
    expect(decideAccess({ ...base, linkEnabled: false }, now).kind).toBe("NOT_FOUND");
  });

  it("expires past the date and asks to persist the flip", () => {
    expect(decideAccess({ ...base, expiresAt: past }, now)).toEqual({ kind: "EXPIRED", flipStatus: true });
    expect(decideAccess({ ...base, status: "EXPIRED" }, now)).toEqual({ kind: "EXPIRED", flipStatus: false });
    expect(decideAccess({ ...base, expiresAt: future }, now).kind).toBe("GRANTED");
  });

  it("requires the password unless the session already passed it", () => {
    const locked = { ...base, hasPassword: true };
    expect(decideAccess(locked, now).kind).toBe("NEEDS_PASSWORD");
    expect(decideAccess({ ...locked, session: { accessVersion: 1, passwordOk: true, expiresAt: future } }, now).kind).toBe("GRANTED");
  });

  it("invalidates sessions after the link or password changes", () => {
    const session = { accessVersion: 1, passwordOk: true, expiresAt: future };
    expect(decideAccess({ ...base, hasPassword: true, accessVersion: 2, session }, now).kind).toBe("NEEDS_PASSWORD");
  });

  it("rejects expired sessions", () => {
    const session = { accessVersion: 1, passwordOk: true, expiresAt: past };
    expect(decideAccess({ ...base, hasPassword: true, session }, now).kind).toBe("NEEDS_PASSWORD");
  });

  it("lets the owner preview drafts", () => {
    expect(decideAccess({ ...base, status: "DRAFT", hasPassword: true, ownerPreview: true }, now)).toEqual({
      kind: "GRANTED",
      preview: true,
      sessionValid: false,
    });
  });
});
