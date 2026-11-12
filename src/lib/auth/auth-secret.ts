/**
 * BETTER_AUTH_SECRET signs the session cookies and encrypts the authenticator secret and backup codes. Better Auth
 * only warns about a short one, and the old check in lib/env was never called; in production a short secret now stops
 * the server instead of running weak. (Missing entirely, Better Auth refuses to start on its own.)
 */
export const MIN_AUTH_SECRET_LENGTH = 32;

export function authSecret(env: Record<string, string | undefined> = process.env): string | undefined {
  const secret = env.BETTER_AUTH_SECRET;
  if (env.NODE_ENV === "production" && secret !== undefined && secret.length < MIN_AUTH_SECRET_LENGTH) {
    throw new Error(`BETTER_AUTH_SECRET must be at least ${MIN_AUTH_SECRET_LENGTH} characters`);
  }
  return secret;
}
