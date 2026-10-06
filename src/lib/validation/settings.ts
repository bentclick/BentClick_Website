import { z } from "zod";
import { DownloadQuality, GalleryLayout } from "@/generated/prisma/enums";

const optionalUrl = z.union([z.url("Informe um endereço completo (https://…)").max(200), z.literal("")]);
const optionalEmail = z.union([z.email("Informe um e-mail válido").max(254), z.literal("")]);

export const profileSchema = z.object({
  name: z.string().trim().min(1, "Informe seu nome").max(80),
  brandName: z.string().trim().min(1, "Informe o nome do estúdio").max(80),
  professionalTitle: z.string().trim().max(60),
  tagline: z.string().trim().max(160),
  websiteUrl: optionalUrl,
  instagram: z.string().trim().max(60),
  replyToEmail: optionalEmail,
});

export const galleryDefaultsSchema = z.object({
  defaultExpiryDays: z.union([z.literal(0), z.literal(7), z.literal(15), z.literal(30), z.literal(60), z.literal(90)]),
  defaultAllowFavorites: z.boolean(),
  defaultAllowIndividualDownload: z.boolean(),
  defaultAllowFullDownload: z.boolean(),
  defaultAllowSharing: z.boolean(),
  defaultDownloadQuality: z.enum(DownloadQuality),
  defaultLayout: z.enum(GalleryLayout),
  defaultWatermarkId: z.union([z.cuid(), z.literal("")]),
});

export const clientSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome").max(120),
  email: optionalEmail,
  phone: z.string().trim().max(30),
  notes: z.string().trim().max(2000),
});

export type ProfileInput = z.infer<typeof profileSchema>;
export type GalleryDefaultsInput = z.infer<typeof galleryDefaultsSchema>;
export type ClientInput = z.infer<typeof clientSchema>;
