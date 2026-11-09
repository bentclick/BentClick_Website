import { z } from "zod";

export const editPresignSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.string().max(100),
  size: z.number().int().positive(),
});

export type EditPresignRequest = z.infer<typeof editPresignSchema>;

const pendingEditSchema = z.object({
  key: z.string().min(1),
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().int().positive(),
});

export type PendingEdit = z.infer<typeof pendingEditSchema>;

/** Reads the JSON column; anything unexpected counts as no pending upload. */
export function parsePendingEdit(value: unknown): PendingEdit | null {
  const parsed = pendingEditSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
