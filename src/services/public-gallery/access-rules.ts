import type { CollectionStatus } from "@/generated/prisma/enums";

export type AccessInput = {
  status: CollectionStatus;
  linkEnabled: boolean;
  expiresAt: Date | null;
  hasPassword: boolean;
  accessVersion: number;
  /** Owner viewing with ?preview=1 — bypasses publication, expiry and password. */
  ownerPreview: boolean;
  session: { accessVersion: number; passwordOk: boolean; expiresAt: Date } | null;
};

export type AccessDecision =
  | { kind: "NOT_FOUND" } // draft, archived, unknown or disabled link — never reveal which
  | { kind: "EXPIRED"; flipStatus: boolean }
  | { kind: "NEEDS_PASSWORD" }
  | { kind: "GRANTED"; preview: boolean; sessionValid: boolean };

/** docs/ARCHITECTURE.md §6 — every public gallery request goes through this. */
export function decideAccess(input: AccessInput, now: Date = new Date()): AccessDecision {
  if (input.ownerPreview) return { kind: "GRANTED", preview: true, sessionValid: false };

  if (!input.linkEnabled) return { kind: "NOT_FOUND" };
  if (input.status === "DRAFT" || input.status === "ARCHIVED") return { kind: "NOT_FOUND" };

  const pastExpiry = input.expiresAt !== null && input.expiresAt.getTime() <= now.getTime();
  if (input.status === "EXPIRED" || pastExpiry) return { kind: "EXPIRED", flipStatus: input.status === "PUBLISHED" };

  const sessionValid =
    input.session !== null && input.session.accessVersion === input.accessVersion && input.session.expiresAt.getTime() > now.getTime();

  if (input.hasPassword && !(sessionValid && input.session?.passwordOk)) return { kind: "NEEDS_PASSWORD" };
  return { kind: "GRANTED", preview: false, sessionValid };
}
