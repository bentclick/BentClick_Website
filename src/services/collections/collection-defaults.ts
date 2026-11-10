import type { PhotographerProfile } from "@/generated/prisma/client";
import { EXPIRY_PRESETS, type ExpiryPreset } from "@/lib/constants/collection";
import type { CreateCollectionInput } from "@/lib/validation/collection";
import { suggestGalleryPassword } from "@/lib/validation/gallery-password";

function presetFromDays(days: number | null): ExpiryPreset {
  if (days === null) return "never";
  const match = EXPIRY_PRESETS.find((p) => p === String(days));
  return match ?? "30";
}

/** Initial form values derived from the photographer's gallery defaults. */
export function defaultCollectionInput(profile: PhotographerProfile): CreateCollectionInput {
  return {
    title: "",
    client: { mode: "none" },
    eventDate: "",
    category: "WEDDING",
    expiryPreset: presetFromDays(profile.defaultExpiryDays),
    customExpiry: "",
    isPrivate: true,
    // every new gallery starts protected by a fresh random password the photographer can read later
    requirePassword: true,
    password: suggestGalleryPassword(),
    allowFavorites: profile.defaultAllowFavorites,
    allowIndividualDownload: profile.defaultAllowIndividualDownload,
    allowFullDownload: profile.defaultAllowFullDownload,
    allowSharing: profile.defaultAllowSharing,
    downloadQuality: profile.defaultDownloadQuality,
    watermarkId: profile.defaultWatermarkId ?? "",
  };
}
