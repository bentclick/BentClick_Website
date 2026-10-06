import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/db/prisma";
import { ensurePhotographerProfile } from "@/services/profile/profile.service";

export const isSignupAllowed = process.env.ALLOW_SIGNUP === "true";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    // Single-photographer product: sign-up only while bootstrapping.
    disableSignUp: !isSignupAllowed,
    minPasswordLength: 10,
    maxPasswordLength: 128,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 14, // 14 days
    updateAge: 60 * 60 * 24, // refresh daily
  },
  rateLimit: { enabled: true, window: 60, max: 30 },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await ensurePhotographerProfile(user.id, user.name);
        },
      },
    },
  },
  // Must stay last: lets Server Actions set auth cookies.
  plugins: [nextCookies()],
});
