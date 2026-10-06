import { z } from "zod";
import { PortfolioCategory } from "@/generated/prisma/enums";
import { MAX_FILES_PER_BATCH } from "@/lib/uploads/file-types";
import { idSchema } from "./common";

export const albumInputSchema = z.object({
  title: z.string().trim().min(1, "Informe o nome do álbum").max(100),
  category: z.enum(PortfolioCategory),
  description: z.string().trim().max(1000),
  isPublished: z.boolean(),
});

export const createAlbumSchema = albumInputSchema;
export const updateAlbumSchema = albumInputSchema.extend({ albumId: idSchema });

export const portfolioPresignSchema = z.object({
  albumId: idSchema,
  files: z
    .array(z.object({ clientId: z.string().min(1).max(64), name: z.string().min(1).max(255), type: z.string().max(100), size: z.number().int().positive() }))
    .min(1)
    .max(MAX_FILES_PER_BATCH),
});

export const portfolioResignSchema = z.object({ imageId: idSchema });
export const portfolioCompleteSchema = z.object({ imageIds: z.array(idSchema).min(1).max(MAX_FILES_PER_BATCH) });

export type AlbumInput = z.infer<typeof albumInputSchema>;
