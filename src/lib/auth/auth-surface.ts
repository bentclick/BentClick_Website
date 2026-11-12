/**
 * The Better Auth endpoints the site answers. The library and its plugins mount many more than the screens use
 * (sign-in by e-mail code, 2FA by e-mail, `get-totp-uri`, `update-session`…), and an upgrade can add one silently:
 * each of those is a way around the password or the authenticator. So the list is an allowlist checked in the
 * `before` hook, and a test compares it with what the installed version mounts.
 *
 * Pure: the test and the hook read the same rules.
 */

export const OPEN_AUTH_PATHS: ReadonlySet<string> = new Set([
  "/sign-in/email",
  "/sign-up/email", // refused by Better Auth itself unless ALLOW_SIGNUP=true
  "/sign-out",
  "/get-session",
  "/request-password-reset",
  "/reset-password",
  "/reset-password/:token", // the link in the e-mail
  "/change-password",
  "/two-factor/enable",
  "/two-factor/disable",
  "/two-factor/verify-totp",
  "/two-factor/verify-backup-code",
  "/two-factor/generate-backup-codes",
  "/ok",
  "/error",
]);

/**
 * Paths that hand out, replace or remove a credential: only within 30 minutes of a full login. Better Auth's own
 * `freshAge` covers none of these in 1.7.7 (disable and change-password use a different middleware that only asks for
 * a session), so the check is ours, for all of them.
 */
export const FRESH_SESSION_PATHS: ReadonlySet<string> = new Set([
  "/two-factor/enable",
  "/two-factor/disable",
  "/two-factor/generate-backup-codes",
  "/change-password",
]);
export const FRESH_SESSION_SECONDS = 30 * 60;

export const CLOSED_AUTH_MESSAGE = "Este caminho de acesso não está disponível.";

/** Why a call is refused before it reaches Better Auth, or null to let it through. */
export function closedAuthReason(path: string, body: unknown): string | null {
  if (!OPEN_AUTH_PATHS.has(path)) return CLOSED_AUTH_MESSAGE;
  const b = (body ?? {}) as { trustDevice?: unknown; method?: unknown };
  // "Confiar neste dispositivo" skipped the code for 30 days and renewed itself on every login (owner decision: removed).
  if (path.startsWith("/two-factor/verify-") && b.trustDevice === true) return "Confirme com o código a cada login.";
  if (path === "/two-factor/enable" && b.method !== undefined && b.method !== "totp") return "O segundo fator é o aplicativo autenticador.";
  return null;
}
