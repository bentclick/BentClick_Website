import { describe, expect, it } from "vitest";
import { sessionState } from "./session-policy";

const login = new Date("2026-11-11T08:00:00Z");
const at = (h: number, m = 0) => new Date(login.getTime() + (h * 60 + m) * 60_000);

describe("sessionState", () => {
  it("stays active while the person keeps working", () => {
    expect(sessionState({ createdAt: login, updatedAt: at(5) }, at(6))).toBe("active");
  });

  it("ends after 2 h without a gesture (plus the grace)", () => {
    expect(sessionState({ createdAt: login, updatedAt: at(1) }, at(3, 1))).toBe("active");
    expect(sessionState({ createdAt: login, updatedAt: at(1) }, at(3, 2))).toBe("idle");
  });

  it("ends 12 h after login even when in use", () => {
    expect(sessionState({ createdAt: login, updatedAt: at(11, 59) }, at(11, 59))).toBe("active");
    expect(sessionState({ createdAt: login, updatedAt: at(11, 59) }, at(12))).toBe("expired");
  });

  it("ends a session from before the rule (14 days, renewed daily)", () => {
    const old = new Date(login.getTime() - 9 * 24 * 3600_000);
    expect(sessionState({ createdAt: old, updatedAt: at(0) }, at(0, 5))).toBe("expired");
  });
});
