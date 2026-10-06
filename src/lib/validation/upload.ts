import { z } from "zod";
import { MAX_FILES_PER_BATCH } from "@/lib/uploads/file-types";

const id = z.cuid();

export const presignRequestSchema = z.object({
  collectionId: id,
  galleryId: id,
  files: z
    .array(
      z.object({
        clientId: z.string().min(1).max(64), // echo key so the browser can match responses
        name: z.string().min(1).max(255),
        type: z.string().max(100),
        size: z.number().int().positive(),
      }),
    )
    .min(1)
    .max(MAX_FILES_PER_BATCH),
});

export const resignRequestSchema = z.object({ photoId: id });

export const completeRequestSchema = z.object({
  photoIds: z.array(id).min(1).max(MAX_FILES_PER_BATCH),
});

export type PresignRequest = z.infer<typeof presignRequestSchema>;

export type PresignedUpload = { clientId: string; photoId: string; url: string; contentType: string };
export type PresignResponse = { uploads: PresignedUpload[]; rejected: { clientId: string; reason: string }[] };
export type CompleteResponse = { completed: string[]; failed: { photoId: string; reason: string }[] };
