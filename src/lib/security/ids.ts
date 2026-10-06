import { randomBytes } from "node:crypto";

/**
 * Collision-resistant id in the same shape as Prisma's cuid ("c" + base36),
 * generated up front when a row's id is needed before insert (e.g. to build
 * its storage key).
 */
export function newId(): string {
  const time = Date.now().toString(36);
  const random = BigInt(`0x${randomBytes(12).toString("hex")}`).toString(36).padStart(18, "0");
  return `c${time}${random}`.slice(0, 25);
}
