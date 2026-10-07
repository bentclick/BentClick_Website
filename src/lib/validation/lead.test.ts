import { describe, expect, it } from "vitest";
import { leadSchema } from "./lead";

const valid = { name: "Ana", email: "ana@example.com", message: "Quero fotografar meu casamento em maio." };

describe("leadSchema", () => {
  it("accepts a minimal message and fills defaults", () => {
    const r = leadSchema.parse(valid);
    expect(r).toMatchObject({ phone: "", eventType: "", eventDate: "", website: "" });
  });

  it("accepts optional details", () => {
    expect(leadSchema.safeParse({ ...valid, phone: "+55 (11) 99999-0000", eventType: "WEDDING", eventDate: "2027-05-20" }).success).toBe(true);
  });

  it.each([
    [{ ...valid, email: "nope" }],
    [{ ...valid, message: "oi" }],
    [{ ...valid, phone: "<script>" }],
    [{ ...valid, eventType: "PARTY" }],
    [{ ...valid, eventDate: "20/05/2027" }],
    [{ ...valid, name: "" }],
  ])("rejects %o", (input) => {
    expect(leadSchema.safeParse(input).success).toBe(false);
  });
});
