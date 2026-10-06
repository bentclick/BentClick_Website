import { z } from "zod";
import { WatermarkPosition, WatermarkType } from "@/generated/prisma/enums";
import { idSchema } from "./common";

export const watermarkSchema = z
  .object({
    name: z.string().trim().min(1, "Dê um nome à marca d’água").max(60),
    type: z.enum(WatermarkType),
    text: z.string().trim().max(60),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida"),
    opacity: z.number().min(0.05).max(1),
    size: z.number().min(0.05).max(0.8),
    position: z.enum(WatermarkPosition),
    margin: z.number().int().min(0).max(400),
    tile: z.boolean(),
  })
  .refine((w) => w.type !== "TEXT" || w.text.length > 0, { path: ["text"], message: "Escreva o texto da marca d’água" });

export const updateWatermarkSchema = z.object({ watermarkId: idSchema, data: watermarkSchema });

export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const LOGO_TYPES: Record<string, string> = { "image/png": "png", "image/webp": "webp" };

export type WatermarkInput = z.infer<typeof watermarkSchema>;
