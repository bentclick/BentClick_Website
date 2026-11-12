import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { sessionState } from "./session-policy";
import { endSession } from "./session-store";

export type CurrentUser = { id: string; name: string; email: string; image: string | null };

/** Where an account without the authenticator goes: nothing else of the dashboard opens until it is on. */
export const TWO_FACTOR_SETUP_PATH = "/ativar-2fa";

type LiveSession = { user: CurrentUser; sessionId: string; twoFactorEnabled: boolean };

/**
 * Full session validation (DB-backed), cached per request. A session that is idle for 2 h or past 12 h is ended here
 * and counts as none (session-policy.ts), for every page, action and route alike.
 */
const readSession = cache(async (): Promise<LiveSession | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const state = sessionState({ createdAt: new Date(session.session.createdAt), updatedAt: new Date(session.session.updatedAt) }, new Date());
  if (state !== "active") {
    await endSession(session.session.id);
    return null;
  }
  const { id, name, email, image, twoFactorEnabled } = session.user;
  return { user: { id, name, email, image: image ?? null }, sessionId: session.session.id, twoFactorEnabled: twoFactorEnabled === true };
});

/** The signed-in photographer, or null — also null while the authenticator isn't on (2FA is required, owner decision). */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await readSession();
  return session?.twoFactorEnabled ? session.user : null;
});

/** For pages: redirects to /login when signed out, and to the 2FA setup while it is off. */
export async function requireUser(): Promise<CurrentUser> {
  const session = await readSession();
  if (!session) redirect("/login");
  if (!session.twoFactorEnabled) redirect(TWO_FACTOR_SETUP_PATH);
  return session.user;
}

/** Only for the 2FA setup page and the activity ping: a live session, authenticator on or not. */
export async function requireSessionAllowingSetup(): Promise<LiveSession | null> {
  return readSession();
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

/** For actions / route handlers: throws instead of redirecting (also while 2FA is off). */
export async function assertUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}
