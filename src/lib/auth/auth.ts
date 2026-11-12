import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware, getSessionFromCtx, isAPIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins";
import { prisma } from "@/lib/db/prisma";
import { defaultFrom, sendEmail } from "@/lib/email/resend";
import { passwordResetEmail } from "@/lib/email/templates";
import { consumeRateLimit, consumeRateLimitWindow, isRateLimited } from "@/lib/security/rate-limit";
import { ensurePhotographerProfile } from "@/services/profile/profile.service";
import { closedAuthReason, FRESH_SESSION_PATHS, FRESH_SESSION_SECONDS } from "./auth-surface";
import { authSecret } from "./auth-secret";
import { forgetTrustedDevices, revokeOtherSessions } from "./session-store";
import { SESSION_ABSOLUTE_SECONDS, sessionState } from "./session-policy";

export const isSignupAllowed = process.env.ALLOW_SIGNUP === "true";

/**
 * Wrong passwords per account, on top of the per-IP limit (an attacker can rotate IPs, not accounts). Only failures
 * count, so the owner's own logins never use up the window. Known cost: someone who knows the e-mail can still keep the
 * account locked by failing on purpose; with the authenticator required, a guessed password alone opens nothing.
 */
const LOGIN_FAILURES_PER_ACCOUNT = 15;
const LOGIN_WINDOW_SECONDS = 15 * 60;
const loginKey = (email: string) => `login:${email}`;
const RESET_REQUESTS_PER_EMAIL = 3;

/** Paths a person reaches without a session (or before having one); every other path needs a live session. */
const NO_SESSION_PATHS = new Set(["/sign-in/email", "/sign-up/email", "/sign-out", "/request-password-reset", "/reset-password", "/reset-password/:token", "/two-factor/verify-totp", "/two-factor/verify-backup-code", "/ok", "/error"]);

const emailOf = (body: unknown) => {
  const email = (body as { email?: unknown } | undefined)?.email;
  return typeof email === "string" ? email.trim().toLowerCase() : "";
};

export const auth = betterAuth({
  appName: "BentClick",
  secret: authSecret(),
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    // Single-photographer product: sign-up only while bootstrapping.
    disableSignUp: !isSignupAllowed,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    resetPasswordTokenExpiresIn: 30 * 60,
    revokeSessionsOnPasswordReset: true,
    // Not awaited: the response time must not reveal whether the e-mail has an account.
    sendResetPassword: async ({ user, url }) => {
      const { html, text } = passwordResetEmail({ studio: "BentClick", url });
      void sendEmail({ from: defaultFrom("BentClick"), to: user.email, subject: "Redefinir a senha do painel", html, text }).catch((e) =>
        console.error("password reset email failed", e),
      );
    },
  },
  // 12 h from login, never renewed; the idle limit is checked on top (session-policy.ts). Changing the password or
  // turning 2FA off needs a login from the last 30 minutes.
  session: {
    expiresIn: SESSION_ABSOLUTE_SECONDS,
    disableSessionRefresh: true,
    freshAge: FRESH_SESSION_SECONDS,
  },
  // Stored in Postgres (one atomic upsert, shared with the gallery limits): in-memory counters reset per serverless instance.
  rateLimit: {
    enabled: true,
    customStorage: { consume: (key, rule) => consumeRateLimitWindow(`auth:${key}`, rule.max, rule.window) },
    window: 60,
    max: 30,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/two-factor/*": { window: 60, max: 5 },
      "/request-password-reset": { window: 60 * 60, max: 3 },
      "/reset-password": { window: 10 * 60, max: 5 },
      "/change-password": { window: 10 * 60, max: 5 },
    },
  },
  advanced: {
    // Vercel sets these from the real connection; a client-sent X-Forwarded-For is not trusted first.
    ipAddress: { ipAddressHeaders: ["x-vercel-forwarded-for", "x-real-ip", "x-forwarded-for"] },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      const closed = closedAuthReason(ctx.path, ctx.body);
      if (closed) throw new APIError("FORBIDDEN", { message: closed });

      if (ctx.path === "/sign-in/email") {
        const email = emailOf(ctx.body);
        if (email && (await isRateLimited(loginKey(email), LOGIN_FAILURES_PER_ACCOUNT))) {
          throw new APIError("TOO_MANY_REQUESTS", { message: "Muitas tentativas. Aguarde alguns minutos e tente de novo." });
        }
        // Devices trusted before the owner removed the option would still skip the code: forget them before every login.
        await forgetTrustedDevices();
        return;
      }
      if (ctx.path === "/request-password-reset") {
        // Per address too: the per-IP limit alone lets rotating IPs flood the inbox (same answer whether it exists or not).
        const email = emailOf(ctx.body);
        if (email && !(await consumeRateLimit(`reset:${email}`, RESET_REQUESTS_PER_EMAIL, 60 * 60))) {
          throw new APIError("TOO_MANY_REQUESTS", { message: "Muitas tentativas. Aguarde e tente de novo mais tarde." });
        }
        return;
      }
      // Only calls from the browser: the server's own getSession (lib/auth/session.ts) applies the same rule itself.
      if (NO_SESSION_PATHS.has(ctx.path) || !ctx.request) return;

      // Everything else acts on a session: an idle or expired one counts as none, and the second factor is only
      // handed out (enable, new backup codes) right after a full login.
      const current = await getSessionFromCtx(ctx);
      if (!current) return; // Better Auth answers 401 itself
      const session = { createdAt: new Date(current.session.createdAt), updatedAt: new Date(current.session.updatedAt) };
      if (sessionState(session, new Date()) !== "active") throw new APIError("UNAUTHORIZED", { message: "Sua sessão terminou. Entre de novo." });
      if (FRESH_SESSION_PATHS.has(ctx.path) && Date.now() - session.createdAt.getTime() > FRESH_SESSION_SECONDS * 1000) {
        throw new APIError("FORBIDDEN", { message: "Por segurança, saia e entre de novo para fazer isso." });
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      const failed = isAPIError(ctx.context.returned);
      if (ctx.path === "/sign-in/email") {
        const email = emailOf(ctx.body);
        if (failed && email) await consumeRateLimit(loginKey(email), LOGIN_FAILURES_PER_ACCOUNT, LOGIN_WINDOW_SECONDS);
        return;
      }
      // Turning the authenticator on or off answers "someone may have my password": nobody else stays signed in.
      // verify-totp with a session is the enrolment step; without one it is an ordinary login (other devices stay).
      const kept = ctx.context.newSession;
      if (failed || !kept) return;
      const enrolment = ctx.path === "/two-factor/verify-totp" && !(await ctx.getSignedCookie(ctx.context.createAuthCookie("two_factor").name, ctx.context.secret));
      if (enrolment || ctx.path === "/two-factor/disable") await revokeOtherSessions(kept.user.id, kept.session.token);
    }),
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await ensurePhotographerProfile(user.id, user.name);
        },
      },
    },
  },
  plugins: [
    // Authenticator app (TOTP) + single-use backup codes; enabling requires a verified code.
    twoFactor({ issuer: "BentClick", backupCodeOptions: { amount: 10, length: 10, storeBackupCodes: "encrypted" } }),
    // Must stay last: lets Server Actions set auth cookies.
    nextCookies(),
  ],
});
