import { z } from "zod";
import { CollectionCategory, DownloadQuality, GalleryLayout } from "@/generated/prisma/enums";
import { EXPIRY_PRESETS } from "@/lib/constants/collection";
import { idSchema } from "./common";
import { galleryPasswordSchema } from "./gallery-password";

const isoDate = z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida"), z.literal("")]);

export const detailsSchema = z.object({
  collectionId: idSchema,
  title: z.string().trim().min(1, "Informe o nome da coleção").max(120),
  description: z.string().trim().max(2000),
  eventDate: isoDate,
  category: z.enum(CollectionCategory),
  clientId: z.union([idSchema, z.literal("")]),
});

/** "keep" leaves the current expiry untouched; presets count from today. */
export const expirySchema = z
  .object({
    collectionId: idSchema,
    preset: z.enum(["keep", ...EXPIRY_PRESETS]),
    customDate: isoDate,
  })
  .refine((v) => v.preset !== "custom" || v.customDate !== "", { path: ["customDate"], message: "Escolha a data de expiração" });

export const accessSchema = z.object({
  collectionId: idSchema,
  isPrivate: z.boolean(),
  requireClientIdentity: z.boolean(),
});

export const passwordSchema = z.object({
  collectionId: idSchema,
  // null removes the password
  password: z.union([galleryPasswordSchema, z.null()]),
});

export const permissionsSchema = z.object({
  collectionId: idSchema,
  allowFavorites: z.boolean(),
  allowIndividualDownload: z.boolean(),
  allowFullDownload: z.boolean(),
  allowSharing: z.boolean(),
  downloadQuality: z.enum(DownloadQuality),
  layout: z.enum(GalleryLayout),
});

export const linkSchema = z.object({ collectionId: idSchema, enabled: z.boolean() });

export type DetailsInput = z.infer<typeof detailsSchema>;
export type ExpiryInput = z.infer<typeof expirySchema>;
export type AccessInput = z.infer<typeof accessSchema>;
export type PermissionsInput = z.infer<typeof permissionsSchema>;
