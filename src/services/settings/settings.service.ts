import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { GalleryDefaultsInput, ProfileInput } from "@/lib/validation/settings";
import { NotFoundError } from "@/services/errors";
import { getPhotographerProfile } from "@/services/profile/profile.service";
import { getStorageUsage } from "@/services/storage/storage.service";

export async function getSettings(userId: string, fallbackName: string) {
  const [user, profile, storage, watermarks] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, email: true, twoFactorEnabled: true } }),
    getPhotographerProfile(userId, fallbackName),
    getStorageUsage(userId),
    prisma.watermark.findMany({ where: { userId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return { user, profile, storage, watermarks };
}

export async function updateProfile(userId: string, input: ProfileInput) {
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { name: input.name } }),
    prisma.photographerProfile.update({
      where: { userId },
      data: {
        brandName: input.brandName,
        professionalTitle: input.professionalTitle || "Fotógrafo",
        tagline: input.tagline || null,
        websiteUrl: input.websiteUrl || null,
        instagram: input.instagram.replace(/^@/, "") || null,
        replyToEmail: input.replyToEmail || null,
      },
    }),
  ]);
}

/** Defaults pre-fill every new collection; existing collections are untouched. */
export async function updateGalleryDefaults(userId: string, input: GalleryDefaultsInput) {
  if (input.defaultWatermarkId) {
    const owned = await prisma.watermark.count({ where: { id: input.defaultWatermarkId, userId } });
    if (!owned) throw new NotFoundError("Watermark");
  }
  await prisma.photographerProfile.update({
    where: { userId },
    data: {
      defaultExpiryDays: input.defaultExpiryDays === 0 ? null : input.defaultExpiryDays,
      defaultAllowFavorites: input.defaultAllowFavorites,
      defaultAllowIndividualDownload: input.defaultAllowIndividualDownload,
      defaultAllowFullDownload: input.defaultAllowFullDownload,
      defaultAllowSharing: input.defaultAllowSharing,
      defaultDownloadQuality: input.defaultDownloadQuality,
      defaultLayout: input.defaultLayout,
      defaultWatermarkId: input.defaultWatermarkId || null,
    },
  });
}
