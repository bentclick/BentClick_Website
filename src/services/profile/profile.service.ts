import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db/prisma";
import { findProfileByUserId, upsertProfile } from "./profile.repository";

/** Idempotent: called from the auth sign-up hook and lazily on first dashboard load. */
export function ensurePhotographerProfile(userId: string, displayName: string) {
  return upsertProfile(prisma, userId, displayName.trim() || "Studio");
}

export const getPhotographerProfile = cache(async (userId: string, fallbackName: string) => {
  return (await findProfileByUserId(prisma, userId)) ?? ensurePhotographerProfile(userId, fallbackName);
});
