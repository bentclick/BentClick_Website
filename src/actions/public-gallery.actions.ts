"use server";

import { z } from "zod";
import { type ActionResult, ok, toActionError } from "@/lib/actions/result";
import { unlockWithPassword } from "@/services/public-gallery/public-gallery.service";

const unlockSchema = z.object({ slug: z.string().regex(/^[0-9A-Za-z]{12}$/), password: z.string().min(1).max(64) });

export async function unlockGalleryAction(input: unknown): Promise<ActionResult> {
  try {
    const { slug, password } = unlockSchema.parse(input);
    await unlockWithPassword(slug, password);
    return ok(undefined);
  } catch (error) {
    return toActionError(error);
  }
}
