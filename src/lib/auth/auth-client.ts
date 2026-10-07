"use client";

import { twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// The login form handles the 2FA step inline, so no redirect callback.
export const authClient = createAuthClient({ plugins: [twoFactorClient()] });
