/**
 * How long a dashboard session lives (owner decision, 2026-11-11: "mais rígido").
 *
 * - Absolute: 12 h after login, then a full login with the authenticator code. Better Auth enforces it
 *   (`expiresIn` + `disableSessionRefresh`); `createdAt` is checked here too, because sessions from before this rule
 *   were set to 14 days and renewed every day (a stolen cookie lived forever while it was used).
 * - Idle: 2 h without the person touching the dashboard. "Touching" is a gesture in the browser, sent at most once a
 *   minute (POST /api/session/activity) and stored in the session's `updatedAt`, which Better Auth no longer writes
 *   with refresh disabled. A request alone doesn't count: a tab left open must not keep itself alive.
 *
 * Pure, so the server and the browser read the same numbers.
 */

export const SESSION_ABSOLUTE_SECONDS = 12 * 60 * 60;
export const SESSION_IDLE_MS = 2 * 60 * 60_000;
export const ACTIVITY_PING_MS = 60_000;
/** The last gesture may come up to a ping after the last request: the server cuts a little after the browser would. */
const SERVER_IDLE_GRACE_MS = 2 * 60_000;

export type SessionState = "active" | "idle" | "expired";

export function sessionState(session: { createdAt: Date; updatedAt: Date }, now: Date): SessionState {
  if (now.getTime() >= session.createdAt.getTime() + SESSION_ABSOLUTE_SECONDS * 1000) return "expired";
  if (now.getTime() >= session.updatedAt.getTime() + SESSION_IDLE_MS + SERVER_IDLE_GRACE_MS) return "idle";
  return "active";
}

/** Whether a new gesture may still renew the idle clock (one that arrives after the cut doesn't revive the session). */
export function canRecordActivity(session: { createdAt: Date; updatedAt: Date }, now: Date): boolean {
  return sessionState(session, now) === "active";
}
