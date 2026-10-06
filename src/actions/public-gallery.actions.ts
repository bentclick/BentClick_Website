"use server";

import { z } from "zod";
import { type ActionResult, ok, toActionError } from "@/lib/actions/result";
import { idSchema } from "@/lib/validation/common";
import { submitSelection, toggleFavorite } from "@/services/favorites/favorites.service";
import { unlockWithPassword } from "@/services/public-gallery/public-gallery.service";

const slugSchema = z.string().regex(/^[0-9A-Za-z]{12}$/);

const unlockSchema = z.object({ slug: slugSchema, password: z.string().min(1).max(64) });

export async function unlockGalleryAction(input: unknown): Promise<ActionResult> {
  try {
    const { slug, password } = unlockSchema.parse(input);
    await unlockWithPassword(slug, password);
    return ok(undefined);
  } catch (error) {
    return toActionError(error);
  }
}

export async function toggleFavoriteAction(slug: unknown, photoId: unknown): Promise<ActionResult<{ favorited: boolean; count: number }>> {
  try {
    return ok(await toggleFavorite(slugSchema.parse(slug), idSchema.parse(photoId)));
  } catch (error) {
    return toActionError(error);
  }
}

const selectionSchema = z.object({
  slug: slugSchema,
  clientName: z.string().trim().min(1, "Informe seu nome").max(120),
  clientEmail: z.email("Informe um e-mail válido").max(254),
});

export async function submitSelectionAction(input: unknown): Promise<ActionResult<{ count: number }>> {
  try {
    const { slug, ...identity } = selectionSchema.parse(input);
    return ok(await submitSelection(slug, identity));
  } catch (error) {
    return toActionError(error);
  }
}
