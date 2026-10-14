import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@prisma/adapter-pg", () => ({ PrismaPg: class {} }));
vi.mock("@/generated/prisma/client", () => ({ PrismaClient: class {} }));

describe("withLibpqSslMode", async () => {
  const { withLibpqSslMode } = await import("./prisma");

  it("keeps require semantics explicitly", () => {
    expect(withLibpqSslMode("postgres://u:p@db.example:5432/db?sslmode=require")).toBe("postgres://u:p@db.example:5432/db?sslmode=require&uselibpqcompat=true");
  });

  it.each(["postgresql://u@127.0.0.1:55462/db", "postgres://h/db?sslmode=verify-full", "postgres://h/db?sslmode=require&uselibpqcompat=true", undefined])("leaves %s alone", (url) => {
    expect(withLibpqSslMode(url)).toBe(url);
  });
});
