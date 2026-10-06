import { z } from "zod";
import { CollectionCategory, DownloadQuality } from "@/generated/prisma/enums";
import { EXPIRY_PRESETS } from "@/lib/constants/collection";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida");
const optionalIsoDate = z.union([isoDate, z.literal("")]);

const clientSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("none") }),
  z.object({ mode: z.literal("existing"), clientId: z.string().min(1, "Selecione um cliente") }),
  z.object({
    mode: z.literal("new"),
    name: z.string().trim().min(1, "Informe o nome do cliente").max(120),
    email: z.union([z.email("Informe um e-mail válido").max(254), z.literal("")]),
  }),
]);

/** Create-collection contract. Shared by the form (client) and the server action. */
export const createCollectionSchema = z
  .object({
    title: z.string().trim().min(1, "Informe o nome da coleção").max(120),
    client: clientSchema,
    eventDate: optionalIsoDate,
    category: z.enum(CollectionCategory),
    expiryPreset: z.enum(EXPIRY_PRESETS),
    customExpiry: optionalIsoDate,
    isPrivate: z.boolean(),
    requirePassword: z.boolean(),
    password: z.string().max(64),
    allowFavorites: z.boolean(),
    allowIndividualDownload: z.boolean(),
    allowFullDownload: z.boolean(),
    allowSharing: z.boolean(),
    downloadQuality: z.enum(DownloadQuality),
    watermarkId: z.string(), // "" = none
  })
  .superRefine((value, ctx) => {
    if (value.expiryPreset === "custom" && !value.customExpiry) {
      ctx.addIssue({ code: "custom", path: ["customExpiry"], message: "Escolha a data de expiração" });
    }
    if (value.requirePassword && value.password.trim().length < 4) {
      ctx.addIssue({ code: "custom", path: ["password"], message: "Use pelo menos 4 caracteres" });
    }
  });

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;

export const collectionIdSchema = z.cuid();

/** URL search params for the collections list. Unknown values fall back to defaults. */
export const collectionFiltersSchema = z.object({
  q: z.string().trim().max(100).catch(""),
  status: z.enum(["all", "DRAFT", "PUBLISHED", "EXPIRED", "ARCHIVED"]).catch("all"),
  category: z.union([z.enum(CollectionCategory), z.literal("all")]).catch("all"),
  expiring: z.enum(["any", "7", "15", "30"]).catch("any"),
  eventPeriod: z.enum(["any", "upcoming", "last30", "last90", "year"]).catch("any"),
  favorites: z.enum(["any", "with"]).catch("any"),
  sort: z.enum(["updated", "event", "expires", "title"]).catch("updated"),
  view: z.enum(["grid", "list"]).catch("grid"),
});

export type CollectionFilters = z.infer<typeof collectionFiltersSchema>;
