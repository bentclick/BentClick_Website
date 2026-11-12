import "server-only";
import { prisma } from "@/lib/db/prisma";
import { canRecordActivity } from "./session-policy";

/** Every other session of the user ends; the one that made the change stays. */
export async function revokeOtherSessions(userId: string, keepToken: string): Promise<number> {
  const { count } = await prisma.session.deleteMany({ where: { userId, token: { not: keepToken } } });
  return count;
}

/** A session that is idle or past its 12 h is removed, so its cookie opens nothing anywhere. */
export async function endSession(sessionId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { id: sessionId } });
}

/**
 * "Trust this device" (removed): the plugin keeps each trusted device as a `trust-device-*` verification row and
 * still honours an old cookie while its row exists. Single-owner product, so all of them go.
 */
export async function forgetTrustedDevices(): Promise<void> {
  await prisma.verification.deleteMany({ where: { identifier: { startsWith: "trust-device-" } } });
}

/** A gesture in the dashboard renews the idle clock, unless the session already ran out (that one stays ended). */
export async function recordActivity(sessionId: string, now = new Date()): Promise<boolean> {
  const session = await prisma.session.findUnique({ where: { id: sessionId }, select: { createdAt: true, updatedAt: true } });
  if (!session || !canRecordActivity(session, now)) return false;
  await prisma.session.update({ where: { id: sessionId }, data: { updatedAt: now } });
  return true;
}
