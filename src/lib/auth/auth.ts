import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins";
import { prisma } from "@/lib/db/prisma";
import { defaultFrom, sendEmail } from "@/lib/email/resend";
import { passwordResetEmail } from "@/lib/email/templates";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { ensurePhotographerProfile } from "@/services/profile/profile.service";

export const isSignupAllowed = process.env.ALLOW_SIGNUP === "true";

/** Password guesses per account, on top of the per-IP limit (an attacker can rotate IPs, not accounts). */
const LOGIN_ATTEMPTS_PER_ACCOUNT = 15;
const LOGIN_WINDOW_SECONDS = 15 * 60;

export const auth = betterAuth({
  appName: "BentClick",
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
  session: {
    expiresIn: 60 * 60 * 24 * 14, // 14 days
    updateAge: 60 * 60 * 24, // refresh daily
  },
  // Stored in Postgres: in-memory counters reset per serverless instance.
  rateLimit: {
    enabled: true,
    storage: "database",
    modelName: "authRateLimit",
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
      if (ctx.path !== "/sign-in/email") return;
      const email = typeof ctx.body?.email === "string" ? ctx.body.email.trim().toLowerCase() : "";
      if (email && !(await consumeRateLimit(`login:${email}`, LOGIN_ATTEMPTS_PER_ACCOUNT, LOGIN_WINDOW_SECONDS))) {
        throw new APIError("TOO_MANY_REQUESTS", { message: "Muitas tentativas. Aguarde alguns minutos e tente de novo." });
      }
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
