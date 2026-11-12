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

/** One call can check a whole folder before anything is reserved. */
export const MAX_CHECK_FILES = 2000;

export const duplicateCheckSchema = z.object({
  collectionId: id,
  galleryId: id,
  files: z
    .array(
      z.object({
        clientId: z.string().min(1).max(64),
        name: z.string().min(1).max(255),
        size: z.number().int().positive(),
      }),
    )
    .min(1)
    .max(MAX_CHECK_FILES),
});

export const resignRequestSchema = z.object({ photoId: id });

export const completeRequestSchema = z.object({
  photoIds: z.array(id).min(1).max(MAX_FILES_PER_BATCH),
});

export type PresignRequest = z.infer<typeof presignRequestSchema>;
export type DuplicateCheckRequest = z.infer<typeof duplicateCheckSchema>;
/** clientIds of files that are already in the gallery. */
export type DuplicateCheckResponse = { duplicates: string[] };

export type PresignedUpload = { clientId: string; photoId: string; url: string; contentType: string };
export type PresignResponse = { uploads: PresignedUpload[]; rejected: { clientId: string; reason: string; duplicate?: boolean }[] };
export type CompleteResponse = { completed: string[]; failed: { photoId: string; reason: string }[] };
